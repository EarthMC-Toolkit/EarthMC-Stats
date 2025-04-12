//#region Imports
import * as api from "./utils/api.js"
import * as database from "./utils/db/index.js"

import { 
    formatString,
    OfficialAPI,
    type RawPlayerStatsV3,
    type SquaremapOnlinePlayer
} from "earthmc"

import { 
    getClient, 
    AURORA,
    lastSeenPlayers,
    getProduction
} from "./constants.js"

import { 
    Timestamp
} from "firebase-admin/firestore"

import { 
    type TextChannel,
    Colors, EmbedBuilder 
} from "discord.js"

import { 
    type MapInstance, type ResidentRank,
    type DBAlliance, type DBResident, type DBPlayer,
    type SeenPlayer
} from "./types.js"

import { daysBetween, devsFooter } from "./utils/fn.js"
//#endregion

//#region Call Updates
const oneMinMs = 60 * 1000

export async function initUpdates() {
    await updateLastSeen()

    if (getProduction()) {
        console.log("Production enabled, initializing data updates..")

        await updatePlayers(true)
        await updateMapData(AURORA)
        await updateAlliances(AURORA)
        await updatePlayerStats(AURORA)

        await api.sendAuroraAlliances()
        await api.sendNews(getClient(), 'aurora')

        await sendEmptyAllianceNotif(AURORA)
    }

    setInterval(updateLastSeen, 10 * 1000)

    setInterval(async () => {
        await updatePlayers(false)
        await updateMapData(AURORA)

        await updateAlliances(AURORA)
        await api.sendAuroraAlliances()
    }, 2 * oneMinMs)
    
    setInterval(async () => {
        await updatePlayerStats(AURORA)
        await api.sendNews(getClient(), 'aurora')
    }, 5 * oneMinMs)

    // setInterval(async () => {
    //     await updateFallenTowns(AURORA)
    // }, 2 * oneMinute)

    // Every 12hr, send empty alliances to #editor-chat
    setInterval(() => sendEmptyAllianceNotif(AURORA), 720 * oneMinMs)
}
//#endregion

//#region Database Update Methods
const mapToString = (map: MapInstance, strCase?: 'upper' | 'lower') => {
    let str = map == AURORA ? "Aurora" : "Nova"
    if (strCase) {
        str = strCase == 'lower' ? str.toLowerCase() : str.toUpperCase()
    }

    return str
}

// The #editor-chat channel in EMC Toolkit Development.
const getEditorChannel = () => getClient().channels.cache.get("966398270878392382") as TextChannel

async function updatePlayerStats(map: MapInstance) {
    const pStats: RawPlayerStatsV3 = await OfficialAPI.V3.playerStats().catch(e => { 
        console.error("Error getting player stats from the Official API:\n" + e)
        return null
    })

    if (!pStats || Object.keys(pStats).length < 1) {
        return console.warn(`[${mapToString(map)}] Couldn't update player stats. Failed to fetch from OAPI.`)
    }

    await map.db.setPlayerStats(pStats)
}

async function updateAlliances(map: MapInstance) {
    const mapName = mapToString(map, 'upper')

    const nations = await map.emc.Nations.all()
    if (!nations) return console.warn(`[${mapName}] Couldn't update alliances, failed to fetch nations.`)

    const alliances: DBAlliance[] = await map.db.getAlliances(true)
    if (!alliances) return console.warn(`[${mapName}] Couldn't update alliances, failed to fetch from DB.`)

    const len = alliances.length
    for (let i = 0; i < len; i++) {
        const a = alliances[i]

        const existing = nations.filter(n => a.nations.includes(n.name))
        if (existing.length > 1) a.nations = existing.map(n => n.name)
        else {
            console.log(`Alliance '${a.allianceName}' has no nations.`)

            // TODO: Bring back disband logic (once bug is confirmed fixed)
        }

        const noInvite = "No discord invite has been set for this alliance"
        if (a.discordInvite == noInvite) return

        // Invalid or will expire, set it back to none.
        getClient().fetchInvite(a.discordInvite)
            .then(inv => { if (inv.maxAge > 0) a.discordInvite = noInvite })
            .catch(err => { if (err.code == 10006) a.discordInvite = noInvite })
    }

    await map.db.setAlliances(alliances)
}

async function sendEmptyAllianceNotif(map: MapInstance) {
    const mapName = mapToString(map, 'upper')

    const nations = await map.emc.Nations.all()
    if (!nations) return console.warn(`[${mapName}] Couldn't check empty alliances, failed to fetch nations.`)

    const alliances = await map.db.getAlliances(true)
    if (!alliances) return console.warn(`[${mapName}] Couldn't send notifs! Failed to fetch alliances from DB.`)

    const emptyAlliances: string[] = []
    const alliancesAmt = alliances.length

    for (let i = 0; i < alliancesAmt; i++) {
        const a = alliances[i]

        // Grab all nations that exist in this alliance.
        // An alliance is considered 'empty' with one or no existing nations and is likely to be disbanded.
        const existing = nations.filter(n => a.nations.includes(n.name))
        if (existing.length < 2) {
            emptyAlliances.push(a.allianceName)
            console.log(`Alliance '${a.allianceName}' has less than 2 nations.`)
        }
    }

    if (emptyAlliances.length > 0) {
        const embed = new EmbedBuilder()
            .setTitle(`Empty alliances - ${mapToString(map)}`)
            .setDescription(emptyAlliances.join(', '))
            .setColor(Colors.Orange)
            .setFooter(devsFooter(getClient()))
            .setTimestamp()

        getEditorChannel().send({ embeds: [embed] })
    }
}

async function updatePlayers(botStarting = false) {
    const dbPlayers = await database.getPlayers(botStarting)
    const players = dbPlayers ? await purgeInactive(dbPlayers) : []

    if (players.length < 1) return
    updatePlayerData(players, AURORA)
}

async function updatePlayerData(players: DBPlayer[], map: MapInstance) {
    const mapName = mapToString(map, 'lower')

    const onlinePlayers = await map.emc.Players.online().catch(() => {})
    if (!onlinePlayers) return console.warn(`[${mapName.toUpperCase()}] Error updating player data, bad response getting online players!`)

    //#region Handle online players
    const len = onlinePlayers.length
    const now = Timestamp.now()
    
    for (let i = 0; i < len; i++) {
        const op = onlinePlayers[i]

        const opInDB = players.find(p => p.name == op.name)
        const player = {
            name: op.name,
            lastOnline: {
                //nova: playerInDB?.lastOnline?.nova ?? null,
                aurora: opInDB?.lastOnline?.aurora ?? null
            }
        } as DBPlayer
        
        player.lastOnline[mapName] = now

        // const linkedID = opInDB?.linkedID
        // if (linkedID) player.linkedID = linkedID

        // Not in DB, add them.
        if (!opInDB) players.push(player)
        else {
            const playerIndex = players.indexOf(opInDB)
            players[playerIndex] = player // Update them.
        }
    }
    //#endregion

    await database.setPlayers(players)
}

// Updates: Towns, Nations, Residents
async function updateMapData(map: MapInstance) {
    const mapName = mapToString(map, 'upper')

    const towns = await map.emc.Towns.all().catch(console.error)
    if (!towns) return console.warn(`[${mapName}] Could not update map data! 'towns' is null or undefined.`)

    const nations = await map.emc.Nations.all(towns).catch(console.error)
    if (!nations) return console.warn(`[${mapName}] Could not update map data! 'nations' is null or undefined.`)

    console.log(`[${mapName}] Updating map data..`)

    //#region Town Logic
    const townsArray = towns.map(t => {
        const isNPC = /^NPC[0-9]{1,5}$/.test(t.mayor)
        t["ruined"] = !isNPC && t.residents ? false : true

        return t
    })

    if (townsArray?.length > 0) {
        await map.db.setTowns(townsArray)
    }
    //#endregion

    //#region Resident Logic
    const tLen = townsArray.length
    const residentsArray: DBResident[] = []

    for (let i = 0; i < tLen; i++) {
        const currentTown = townsArray[i]
        if (currentTown['ruined']) continue

        const rLen = currentTown.residents.length
        for (let j = 0; j < rLen; j++) {
            const currentResident = currentTown.residents[j]
            let rank: ResidentRank = currentTown.mayor == currentResident ? "Mayor" : "Resident"

            if (rank == "Mayor" && currentTown.flags.capital) 
                rank = "Nation Leader"
                
            residentsArray.push({
                name: currentResident,
                townName: currentTown.name,
                townNation: currentTown.nation,
                rank: rank
            })
        }
    }

    if (residentsArray?.length > 0) {
        await map.db.setResidents(residentsArray)
    }
    //#endregion

    //#region Nation Logic
    const dbNations = await map.db.getNations().catch(console.warn)
    if (!dbNations) return //console.warn(`[${mapName}] Failed to fetch db nations.`)

    const nationsArray = nations.map(nation => {
        const foundNation = dbNations.find(n => latinize(n.name) == latinize(nation.name))
        if (!foundNation) console.log(`'${nation.name}' does not exist in the DB, creating it..`)

        nation["kingPrefix"] = foundNation?.kingPrefix ?? "",
        nation["flag"] = foundNation?.flag ?? "",
        nation["discord"] = foundNation?.discord ?? ""

        return nation
    })

    // Make sure we don't overwrite with empty/null
    if (nationsArray?.length > 0) {
        await map.db.setNations(nationsArray)
    }
    //#endregion
}

async function updateLastSeen() {
    const ops = await AURORA.emc.Players.online() as SquaremapOnlinePlayer[]
    if (!ops) return console.warn(`[AURORA] Error updating last seen, bad response getting online players!`)

    const now = Date.now()
    
    ops.forEach(op => {
        const seen = lastSeenPlayers.get(op.name)

        op['timesVanished'] = seen ? seen.timesVanished : 0
        op['timestamp'] = now

        lastSeenPlayers.set(op.name, op ) 
    })

    const opNames = new Set(ops.map(op => op.name))
    for (const p of lastSeenPlayers.values()) {
        const newOnline = opNames.has(p.name)
        if (p.online && !newOnline) p.timesVanished++

        p.online = newOnline
    }

    //console.log(`[AURORA] Updated last seen. Length: ${lastSeenPlayers.size}`)
}
//#endregion

//#region Live Stuff
// const filterLiveEmbeds = (arr: Collection<string, Message>, mapName: string) => {
//     return arr.filter(msg => msg.embeds.length >= 1 
//         && msg.embeds[0]?.title?.includes(`Townless Players (${mapName})`) 
//         && msg.author.id == "656231016385478657"
//     )
// }

// const editEmbed = (msg: Message, players: Player[], mapName: string) => {
//     const names = players.map(p => p.name).join('\n')
//     const newEmbed = new EmbedBuilder()
//         .setTitle(`Live Townless Players (${mapName})`)
//         .setColor(Colors.DarkPurple)
//         .setFooter(fn.devsFooter(client))
//         .setTimestamp()

//     let desc = ""
//     const arrLen = players.toString().length

//     if (arrLen < 1) desc = "There are currently no townless players!"
//     else {
//         desc = arrLen >= 2048
//             ? "```" + (names.match(/(?:^.*$\n?){1,30}/mg))[0] + "```"
//             : desc = "```" + players[0].name + "\n" + names + "```"
//     }

//     newEmbed.setDescription(desc)
//     msg.edit({ embeds: [newEmbed] }).catch(err => console.error(err))
// }

// let townsCache = []
// function updateTownCache(data: any[]) { 
//     townsCache = data
//     console.log(`${fn.time()} | Updated fallen town cache. Length: ${data.length}`)
// }

// async function updateFallenTowns(map: MapInstance) {
//     const towns: BaseTown[] = await map.emc.Towns.all().then(arr => arr.map(t => {
//         const NPCRegex = /^NPC[0-9]{1,5}$/
//         t["ruined"] = (NPCRegex.test(t.mayor) || (t.residents?.length ?? 0) < 1) ? true : false

//         return t
//     }))

//     if (!towns) return console.warn("Could not update map data! Failed to fetch towns.")
//     // const msgs = await townFlowChannel.messages.fetch()
//     // const ruinNames = msgs.filter(m => m.embeds[0] != null && m.embeds[0].title.includes("ruined")).map(m => m.embeds[0].fields[0].value)

//     // Channel name: #town-fall-events
//     const townFlowChannel = client.channels.cache.get("1161579122494029834") as TextChannel

//     //#region Send ruined towns
//     // townsArray.forEach(town => {
//     //     if (!ruinNames.includes(town.name) && town.ruined) {
//     //         const ruinEmbed = new Discord.EmbedBuilder()
//     //             .setTitle("A town has ruined!")
//     //             .addFields(fn.embedField(
//     //                 "Town Name", 
//     //                 town.name + (town.capital ? " :star:" : ""), 
//     //                 true
//     //             ))
//     //             .setFooter(fn.devsFooter(client))
//     //             .setThumbnail(client.user.avatarURL())
//     //             .setTimestamp()
//     //             .setColor("ORANGE")

//     //         const mayor = town.mayor.replace(/_/g, "\\_")
//     //         if (mayor) ruinEmbed.addFields(fn.embedField("Mayor", mayor, true))

//     //         const [green, red] = ["<:green_tick:1036290473708495028>", "<:red_tick:1036290475012915270>"]
//     //         ruinEmbed.addFields(
//     //             fn.embedField("Town Size", town.area.toString(), true), 
//     //             fn.embedField("Location", `[${town.x}, ${town.z}](https://map.earthmc.net?worldname=earth&mapname=flat&zoom=6&x=${town.x}&y=64&z=${town.z})`, true),
//     //             fn.embedField("Flags", `
//     //                 ${town.pvp ? green : red } PVP
//     //                 ${town.mobs ? green : red } Mobs 
//     //                 ${town.public ? green : red } Public
//     //                 ${town.explosion ? green : red } Explosions 
//     //                 ${town.fire ? green : red } Fire Spread
//     //             `)
//     //         )

//     //         townFlowChannel.send({embeds: [ruinEmbed]})
//     //     }
//     // })
//     //#endregion

//     //#region Send fallen towns
//     if (townsCache.length > 0) {
//         // Name and mayor have to be changed for it to be "fallen"
//         const fallenTowns = townsCache.filter(cached => {
//             return cached.ruined && !towns.some(cur =>
//                 cur.name == cached.name && 
//                 cur.mayor == cached.mayor
//             )
//         })

//         const fallenTownsLen = fallenTowns.length
//         if (fallenTownsLen < 1) {
//             console.log(fn.time() + " | No towns have fallen.")
//             return
//         }

//         for (let i = 0; i < fallenTownsLen; i++) {
//             const town = fallenTowns[i]
//             const mayor = town.mayor.replace(/_/g, "\\_")

//             const route: RouteInfo = await Aurora.GPS.fastestRoute({ x: town.x, z: town.z })
//             const desc = `Type **/n spawn ${route.nation.name}** and head **${route.direction}** for **${route.distance}** blocks.`

//             // TODO: Check if new arrays inside the loop are intended.
//             const residentBatch1 = []
//             const residentBatch2 = []

//             const fallenTownEmbed = new EmbedBuilder()
//                 .setTitle("A town has fallen!")
//                 .setDescription(desc)
//                 .setFooter(fn.devsFooter(client))
//                 .setThumbnail('attachment://aurora.png')
//                 .setTimestamp()
//                 .setColor(Colors.Green)
//                 .addFields(fn.embedField("Town Name", town.name + (town.capital ? " :star:" : ""), true))

//             if (town.nation != "No Nation") 
//                 fallenTownEmbed.addFields(fn.embedField("Nation", town.nation, true))

//             const townResidentsLen = town.residents.length
//             for (let j = 0; j < townResidentsLen; j++) {
//                 const currentResident = town.residents[j]
//                 const curResIndex = town.residents.indexOf(currentResident)

//                 const batch = (curResIndex <= 50 ? residentBatch1 : residentBatch2)
//                 batch.push(" " + currentResident)
//             }

//             fallenTownEmbed.addFields(fn.embedField("Mayor", 
//                 `${ townResidentsLen >= 28 ? "Lord " 
//                 : townResidentsLen >= 24 ? "Duke "
//                 : townResidentsLen >= 20 ? "Earl "
//                 : townResidentsLen >= 14 ? "Count "
//                 : townResidentsLen >= 10 ? "Viscount "
//                 : townResidentsLen >= 6 ? "Baron "
//                 : townResidentsLen >= 2 ? "Chief "
//                 : townResidentsLen == 1 ? "Hermit " : "" }`
//                 + mayor, true
//             ))

//             fallenTownEmbed.addFields(
//                 fn.embedField("Town Size", town.area.toString(), true),
//                 fn.embedField("Location", `[${town.x}, ${town.z}](https://map.earthmc.net?worldname=earth&mapname=flat&zoom=6&x=${town.x}&y=64&z=${town.z})`, true)
//             )

//             if (residentBatch1.length < 1) {
//                 fallenTownEmbed.addFields(fn.embedField("Residents", "There are no residents in this town?"))
//             } else {
//                 const residentBatch1String = residentBatch1.toString().replace(/^\s+|\s+$/gm, "")

//                  // If second batch is empty, only send first batch
//                 if (residentBatch2.length <= 0) {
//                     fallenTownEmbed.addFields(
//                         fn.embedField(`Residents [${townResidentsLen}]`,
//                         "```" + residentBatch1String + "```"
//                     ))
//                 }
//                 else if (residentBatch2.length >= 1) { // Second batch not empty, send both.
//                     const residentBatch2String = residentBatch2.toString().replace(/^\s+|\s+$/gm, "")

//                     fallenTownEmbed.addFields(
//                         fn.embedField("Residents", townResidentsLen),
//                         fn.embedField("Resident List [1-50]", "```" + residentBatch1String + "```"),
//                         fn.embedField(`Resident List [51-${townResidentsLen}]`, "```" + residentBatch2String + "```")
//                     )
//                 }
//             }

//             townFlowChannel.send({ 
//                 content: "<@&1161647212061806683>",
//                 embeds: [fallenTownEmbed],
//                 files: [fn.AURORA.thumbnail]
//             })
//         }
//     }

//     updateTownCache(towns)
//     //#endregion
// }
//#endregion

//#region Helper Methods
const isInactive = (timestamp: { seconds: number }, now: Date) => {
    const loDate = new Date(timestamp.seconds * 1000)
    return daysBetween(loDate, now) > 42
}

const latinize = (str: string) => formatString(str, true)

async function apiPlayerList() {
    return (await OfficialAPI.V3.playerList()).map(p => p.name)
}

async function purgeInactive(players: DBPlayer[]) {
    const originalLen = players.length
    const allPlayerNames = await apiPlayerList()

    // Get rid of any not in OAPI.
    if (allPlayerNames && allPlayerNames.length > 0) {
        players = players.filter(p => allPlayerNames.includes(p.name))
    }

    //#region Purge if 42'ed
    const now = new Date()
    const inactive: string[] = []

    for (const player of players) {
        const lo = player?.lastOnline
        if (!lo) {
            inactive.push(player.name)
            continue
        }

        //#region Purge if inactive on currently existing maps.
        if (lo.aurora && isInactive(lo.aurora, now)) {
            inactive.push(player.name)
        }
        //#endregion
    }
    //#endregion

    // Get rid of those we marked as inactive.
    players = players.filter(p => !inactive.includes(p.name))

    const purgedAmt = originalLen - players.length
    if (purgedAmt > 0) {
        console.log(`Purged ${purgedAmt} inactive/corrupted players.`)
        //await database.setPlayers(players)
    }

    return players
}
//#endregion