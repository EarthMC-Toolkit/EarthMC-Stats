//#region Imports
import Queue from "./objects/Queue.js"

import * as api from "../bot/utils/api.js"
import * as database from "../bot/utils/database.js"
import * as fn from "../bot/utils/fn.js"

import { 
    type RawPlayer,
    Aurora, 
    MojangLib, 
    Nova, 
    formatString
} from "earthmc"

import { 
    prod, client, 
    AURORA, NOVA, 
    townlessSubbedChannels, 
    queueSubbedChannels
} from "./constants.js"

import { 
    FieldValue,
    Timestamp
} from "firebase-admin/firestore"

import { 
    Collection,
    Colors, EmbedBuilder, 
    Message, TextChannel
} from "discord.js"

import type { MapInstance } from "./types.js"
//#endregion

//#region Call Updates
const oneMinute = 60 * 1000

async function initUpdates() {
    // Pre-fill everything but news.
    await updateData(true, true, true)
    await updateAPI(false, true)

    setInterval(async () => { 
        await liveQueue() 
        liveTownless()
    }, oneMinute)

    // Send alliances to API.
    setInterval(() => updateAPI(false, true), 3 * oneMinute)

    // Update Aurora every 3 minutes (same as Dynmap)
    setInterval(() => updateData(false, true, false), 3.5 * oneMinute)

    // Update Nova and send API news (for both maps) every 10m.
    setInterval(async () => {
        await updateData(false, false, true)
        await updateAPI(true, false)
    }, 10 * oneMinute)

    setInterval(async () => {
        await updateFallenTowns(AURORA)
    }, 2 * oneMinute)

    setInterval(async () => {
        await checkForEmptyAlliances(AURORA)
        await checkForEmptyAlliances(NOVA)
    }, 1440 * oneMinute)
}

async function updateNews() {
    await api.sendNews(client, 'aurora')
    api.sendNews(client, 'nova')
}

async function updateData(botStarting = false, updateAurora = true, updateNova = false) {
    const dbPlayers = await database.getPlayers(botStarting).catch(() => {})
    const players = dbPlayers ? await purgeInactive(dbPlayers) : []

    if (updateAurora) await updateMap(players, AURORA)
    if (updateNova) await updateMap(players, NOVA)

    if (!botStarting) {
        await updateAlliances(AURORA)
        await updateAlliances(NOVA)
    }
}

async function updateMap(players: any[], map: MapInstance) {
    await updateMapData(map)

    if (players.length < 1) return
    updatePlayerData(players, map)
}
//#endregion

//#region Database Update Methods
async function updateAPI(news, alliances) {
    if (alliances) await api.sendAlliances()
    if (news) await updateNews()
}

async function updateAlliances(map: MapInstance) {
    const nations = await map.emc.Nations.all()
    if (!nations) return console.warn("Couldn't update " + map + " alliances, failed to fetch nations.")

    map.db.getAlliances(true).then(async alliances => {
        // For each alliance
        alliances.forEach(alliance => {
            if (nations.length > 0) {
                // Filter out nations that do not exist.
                const existing = nations.filter(nation => exists(nation.name, alliance))

                // No nations exist in the alliance anymore, disband it.
                if (existing.length > 1) alliance.nations = existing.map(n => n.name)
                else console.log(`Alliance '${alliance.allianceName}' has no nations.`)
            }

            const noInvite = "No discord invite has been set for this alliance"
            if (alliance.discordInvite == noInvite) return

            // Invalid or will expire, set it back to none.
            client.fetchInvite(alliance.discordInvite)
                .then(inv => { if (inv.maxAge > 0) alliance.discordInvite = noInvite })
                .catch(err => { if (err.code == 10006) alliance.discordInvite = noInvite })
        })

        map.db.setAlliances(alliances)
    })
}

async function checkForEmptyAlliances(map: MapInstance) {
    const emptyAlliances = []
    const nations = await map.emc.Nations.all()
    if (!nations) return console.warn("Couldn't check empty " + map + " alliances, failed to fetch nations.")

    map.db.getAlliances(true).then(async alliances => {
        // For each alliance
        alliances.forEach(alliance => {
            if (nations.length > 1) {
                // Filter out nations that do not exist.
                const existing = nations.filter(nation => exists(nation.name, alliance))

                // No nations exist in the alliance.
                if (existing.length < 2) {
                    console.log(`Alliance '${alliance.allianceName}' has less than 2 nations.`)
                    emptyAlliances.push(alliance.allianceName)
                }
            } else {
                console.log(`Alliance '${alliance.allianceName}' has less than 2 nations.`)
                emptyAlliances.push(alliance.allianceName)
            }
        })
    })

    if (emptyAlliances.length > 0) {
        const editorChannel = client.channels.cache.get("966398270878392382") as TextChannel
        const mapToString = map == AURORA ? 'Aurora' : 'Nova'
        const embed = new EmbedBuilder()
            .setTitle(`Empty alliances - ${mapToString}`)
            .setDescription(emptyAlliances.join(', '))
            .setFooter(fn.devsFooter(client))
            .setTimestamp()
            .setColor("ORANGE")

        editorChannel.send({embeds: [embed]})
    }
}

// Updates: Player info or remove if purged
async function updatePlayerData(players: any[], map: MapInstance) {
    const mapName = map == AURORA ? 'aurora' : 'nova'

    const onlinePlayers = await map.emc.Players.online().catch(() => {})
    if (!onlinePlayers) return console.log(`Error updating player data on ${mapName}`)

    const now = Timestamp.now()

    //#region Handle online players
    const len = onlinePlayers.length
    for (let i = 0; i < len; i++) {
        const op = onlinePlayers[i]

        const playerInDB = players.find(p => p.name == op.name),
              playerIndex = players.findIndex(p => p.name == op.name)
            
        const player: {
            name: string
            lastOnline: {
                nova: unknown
                aurora: unknown
            }
            linkedID?: string
        } = {
            name: op.name,
            lastOnline: {
                nova: playerInDB?.lastOnline?.nova ?? null,
                aurora: playerInDB?.lastOnline?.aurora ?? null
            }
        }
        
        const linkedId = playerInDB?.linkedID
        if (linkedId) player.linkedID = linkedId

        player.lastOnline[mapName] = now

        // Not in db, add them.
        if (!playerInDB) players.push(player)
        else players[playerIndex] = player // Update them.
    }
    //#endregion

    await database.setPlayers(players)
}

// Updates: Towns, Nations, Residents
async function updateMapData(map: MapInstance) {
    const towns = await map.emc.Towns.all().catch(console.error)
    if (!towns) return console.log("Could not update map data! 'towns' is null or undefined.")

    const nations = await map.emc.Nations.all(towns).catch(console.error)
    if (!nations) return console.log("Could not update map data! 'nations' is null or undefined.")

    console.log('Updating ' + (map == NOVA ? "nova" : "aurora") + ' data..')

    //#region Town Logic 
    const townsArray = towns.map(t => {
        const isNPC = /^NPC[0-9]{1,5}$/.test(t.mayor)
        t["ruined"] = !isNPC && t.residents ? false : true

        return t
    })

    if (townsArray?.length > 0)
        await map.db.setTowns(townsArray)
    //#endregion

    //#region Resident Logic
    const tLen = townsArray.length,
          residentsArray = []

    for (let i = 0; i < tLen; i++) {
        const currentTown = townsArray[i]
        if (currentTown['ruined']) continue

        const rLen = currentTown.residents.length
        for (let j = 0; j < rLen; j++) {
            const currentResident = currentTown.residents[j]
            let rank = currentTown.mayor == currentResident ? "Mayor" : "Resident"

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

    if (residentsArray?.length > 0)
        await map.db.setResidents(residentsArray)
    //#endregion

    //#region Nation Logic
    const dbNations = await map.db.getNations().catch(console.error)
    if (!dbNations) return console.log('Failed to fetch db nations.')

    const nationsArray = nations.map(nation => {
        const foundNation = dbNations.find(n => latinize(n.name) == latinize(nation.name))
        if (!foundNation) console.log(`'${nation.name}' does not exist in the DB, creating it..`)

        nation["kingPrefix"] = foundNation?.kingPrefix ?? "",
        nation["flag"] = foundNation?.flag ?? "",
        nation["discord"] = foundNation?.discord ?? ""

        return nation
    })

    // Make sure we don't overwrite with empty/null
    if (nationsArray?.length > 0)
        map.db.setNations(nationsArray)
    //#endregion
}
//#endregion

//#region Live Stuff
const filterLiveEmbeds = (arr: Collection<string, Message>, mapName: string) => {
    return arr.filter(msg => msg.embeds.length >= 1 
        && msg.embeds[0]?.title?.includes(`Townless Players (${mapName})`) 
        && msg.author.id == "656231016385478657"
    )
}

const editEmbed = (msg: Message, arr: RawPlayer[], mapName: string) => {
    const names = arr.map(player => player.name).join('\n')
    const newEmbed = new EmbedBuilder()
        .setTitle(`Live Townless Players (${mapName})`)
        .setColor(Colors.DarkPurple)
        .setFooter(fn.devsFooter(client))
        .setTimestamp()

    let desc = ""
    const arrLen = arr.toString().length

    if (arrLen < 1) desc = "There are currently no townless players!"
    else {
        desc = arrLen >= 2048 
            ? "```" + (names.match(/(?:^.*$\n?){1,30}/mg))[0] + "```"
            : desc = "```" + arr[0].name + "\n" + names + "```"
    }

    newEmbed.setDescription(desc)
    msg.edit({ embeds: [newEmbed] }).catch(err => console.log(err))
}

async function liveTownless() {
    const townlessSubbedChannelIDs = fn.townlessSubbedChannelArray,
          len = townlessSubbedChannelIDs.length

    const promiseArr = await Promise.all([
        Aurora.Players.townless(), 
        Nova.Players.townless()
    ]).catch(e => { console.error(e); return null })
    
    if (!promiseArr) return
    const [auroraTownless, novaTownless] = promiseArr

    // For every townless subbed channel
    for (let i = 0; i < len; i++) {
        const cur = townlessSubbedChannelIDs[i]
        if (!cur || cur == '') continue
 
        const curChannel = await client.channels.fetch(cur).catch(() => {}) as TextChannel
        if (!curChannel) {
            if (!prod) continue

            console.log(`${fn.time()} | Deleting unavailable channel '${cur}' in townless subs array!`)

            townlessSubbedChannels.update({ channelIDs: FieldValue.arrayRemove(cur) })
            townlessSubbedChannelIDs.splice(i, 1)

            fn.setTownlessSubbedChannels(townlessSubbedChannelIDs)
        } else {
            if (!fn.canViewAndSend(curChannel)) continue
            
            // Fetch the channel's messages.
            curChannel.messages.fetch().then(async msgs => {
                const auroraEmbeds = filterLiveEmbeds(msgs, 'Aurora')
                if (auroraTownless) auroraEmbeds.forEach(msg => editEmbed(msg, auroraTownless, 'Aurora'))

                const novaEmbeds = filterLiveEmbeds(msgs, 'Nova')
                if (novaTownless) novaEmbeds.forEach(msg => editEmbed(msg, novaTownless, 'Nova'))
            }).catch(console.error)
        }
    }
}

async function liveQueue() {              
    const server = await MojangLib.servers.get("play.earthmc.net").catch(() => {})
    const aurora = server ? await database.Aurora.getOnlinePlayerData() : null
    const nova   = server ? await database.Nova.getOnlinePlayerData() : null

    const queue = new Queue(server, aurora, nova)
    await queue.init()

    const embed = new EmbedBuilder()
        .setTitle("Queue & Player Info | Live")
        .setThumbnail(client.user.avatarURL())
        .setColor(Colors.Green)

    const totalMax = (queue.nova.config?.maxcount ?? 100) + (queue.aurora.config?.maxcount ?? 250)
    embed.addFields(
        fn.embedField("Total Queue Count", queue.get(), true),
        fn.embedField("Total Server Count", `${queue.totalPlayers}/${totalMax}`, true),
        fn.embedField("Aurora", queue.aurora.formatted),
        fn.embedField("Nova", queue.nova.formatted)
    )
        
    const queueSubbedChannelIDs = fn.queueSubbedChannelArray,
          len = queueSubbedChannelIDs.length

    for (let i = 0; i < len; i++) {
        const cur = queueSubbedChannelIDs[i]

        if (!cur || cur == '') continue
        const currentQueueSubbedChannel = client.channels.cache.get(cur) as TextChannel

        if (!currentQueueSubbedChannel) {
            if (!prod) continue

            // Delete unavailable channel
            await queueSubbedChannels.update({ channelIDs: FieldValue.arrayRemove(cur) })
            queueSubbedChannelIDs.splice(i, 1)

            fn.setQueueSubbedChannels(queueSubbedChannelIDs)
        } else {
            if (!fn.canViewAndSend(currentQueueSubbedChannel)) continue

            currentQueueSubbedChannel.messages.fetch().then(async msgs => {
                const queueEmbedArray = msgs.filter(msg =>
                    msg.embeds.length >= 1 && 
                    msg.embeds[0].title.includes('Queue') && 
                    msg.author.id == "656231016385478657"
                )

                queueEmbedArray.forEach(m => m.edit({ embeds: [embed] }).catch(() => {}))
            }).catch(() => {})
        }
    }
}

let townsCache = []
function updateTownCache(data: any[]) { 
    townsCache = data
    console.log(`${fn.time()} | Updated fallen town cache. Length: ${data.length}`)
}

async function updateFallenTowns(map: MapInstance) {
    const towns = await map.emc.Towns.all().then(arr => arr.map(t => {
        const NPCRegex = /^NPC[0-9]{1,5}$/
        t["ruined"] = (NPCRegex.test(t.mayor) || (t.residents?.length ?? 0) < 1) ? true : false

        return t
    })).catch(() => null)

    if (!towns) return console.log("Could not update map data! Failed to fetch towns.")
    // const msgs = await townFlowChannel.messages.fetch()
    // const ruinNames = msgs.filter(m => m.embeds[0] != null && m.embeds[0].title.includes("ruined")).map(m => m.embeds[0].fields[0].value)

    const townFlowChannel = client.channels.cache.get("1161579122494029834") as TextChannel

    //#region Send ruined towns
    // townsArray.forEach(town => {
    //     if (!ruinNames.includes(town.name) && town.ruined) {
    //         const ruinEmbed = new Discord.EmbedBuilder()
    //             .setTitle("A town has ruined!")
    //             .addFields(fn.embedField(
    //                 "Town Name", 
    //                 town.name + (town.capital ? " :star:" : ""), 
    //                 true
    //             ))
    //             .setFooter(fn.devsFooter(client))
    //             .setThumbnail(client.user.avatarURL())
    //             .setTimestamp()
    //             .setColor("ORANGE")

    //         const mayor = town.mayor.replace(/_/g, "\\_")
    //         if (mayor) ruinEmbed.addFields(fn.embedField("Mayor", mayor, true))

    //         const [green, red] = ["<:green_tick:1036290473708495028>", "<:red_tick:1036290475012915270>"]
    //         ruinEmbed.addFields(
    //             fn.embedField("Town Size", town.area.toString(), true), 
    //             fn.embedField("Location", `[${town.x}, ${town.z}](https://earthmc.net/map/aurora/?worldname=earth&mapname=flat&zoom=6&x=${town.x}&y=64&z=${town.z})`, true),
    //             fn.embedField("Flags", `
    //                 ${town.pvp ? green : red } PVP
    //                 ${town.mobs ? green : red } Mobs 
    //                 ${town.public ? green : red } Public
    //                 ${town.explosion ? green : red } Explosions 
    //                 ${town.fire ? green : red } Fire Spread
    //             `)
    //         )

    //         townFlowChannel.send({embeds: [ruinEmbed]})
    //     }
    // })
    //#endregion

    //#region Send fallen towns
    if (townsCache.length > 0) {
        // Name and mayor have to be changed for it to be "fallen"
        const fallenTowns = townsCache.filter(cached => {
            return cached.ruined && !towns.some(cur =>
                cur.name == cached.name && 
                cur.mayor == cached.mayor
            )
        })

        const fallenTownsLen = fallenTowns.length
        if (fallenTownsLen < 1) {
            console.log(fn.time() + " | No towns have fallen.")
            return
        }

        for (let i = 0; i < fallenTownsLen; i++) {
            const town = fallenTowns[i],
                  residentBatch1 = [], 
                  residentBatch2 = [],
                  mayor = town.mayor.replace(/_/g, "\\_")

            const route = await Aurora.GPS.fastestRoute({ x: town.x, z: town.z })
            const desc = `Type **/n spawn ${route.nation.name}** and head **${route.direction}** for **${route.distance}** blocks.`

            const fallenTownEmbed = new EmbedBuilder()
                .setTitle("A town has fallen!")
                .setDescription(desc)
                .setFooter(fn.devsFooter(client))
                .setThumbnail('attachment://aurora.png')
                .setTimestamp()
                .setColor(Colors.Green)
                .addFields(fn.embedField("Town Name", town.name + (town.capital ? " :star:" : ""), true))

            if (town.nation != "No Nation") 
                fallenTownEmbed.addFields(fn.embedField("Nation", town.nation, true))

            const townResidentsLen = town.residents.length
            for (let j = 0; j < townResidentsLen; j++) {
                const currentResident = town.residents[j]
                const curResIndex = town.residents.indexOf(currentResident)

                const batch = (curResIndex <= 50 ? residentBatch1 : residentBatch2)
                batch.push(" " + currentResident)
            }

            fallenTownEmbed.addFields(fn.embedField("Mayor", 
                `${ townResidentsLen >= 28 ? "Lord " 
                : townResidentsLen >= 24 ? "Duke "
                : townResidentsLen >= 20 ? "Earl "
                : townResidentsLen >= 14 ? "Count "
                : townResidentsLen >= 10 ? "Viscount "
                : townResidentsLen >= 6 ? "Baron "
                : townResidentsLen >= 2 ? "Chief "
                : townResidentsLen == 1 ? "Hermit " : "" }`
                + mayor, true
            ))

            fallenTownEmbed.addFields(
                fn.embedField("Town Size", town.area.toString(), true),
                fn.embedField("Location", `[${town.x}, ${town.z}](https://earthmc.net/map/aurora/?worldname=earth&mapname=flat&zoom=6&x=${town.x}&y=64&z=${town.z})`, true)
            )

            if (residentBatch1.length < 1) {
                fallenTownEmbed.addFields(fn.embedField("Residents", "There are no residents in this town?"))
            } else {
                const residentBatch1String = residentBatch1.toString().replace(/^\s+|\s+$/gm, "")

                 // If second batch is empty, only send first batch
                if (residentBatch2.length <= 0) {
                    fallenTownEmbed.addFields(
                        fn.embedField(`Residents [${townResidentsLen}]`,
                        "```" + residentBatch1String + "```"
                    ))
                }
                else if (residentBatch2.length >= 1) { // Second batch not empty, send both.
                    const residentBatch2String = residentBatch2.toString().replace(/^\s+|\s+$/gm, "")

                    fallenTownEmbed.addFields(
                        fn.embedField("Residents", townResidentsLen),
                        fn.embedField("Resident List [1-50]", "```" + residentBatch1String + "```"),
                        fn.embedField(`Resident List [51-${townResidentsLen}]`, "```" + residentBatch2String + "```")
                    )
                }
            }

            townFlowChannel.send({ 
                content: "<@&1161647212061806683>",
                embeds: [fallenTownEmbed],
                files: [fn.AURORA.thumbnail]
            })
        }
    }

    updateTownCache(towns)
    //#endregion
}
//#endregion

//#region Helper Methods
const exists = (name, obj, key='nations') => obj[key].includes(name)

const purged = (timestamp: { seconds }, now: Date) => {
    const loDate = new Date(timestamp.seconds * 1000)
    const days = fn.daysBetween(loDate, now)

    return days > 35
}

const latinize = (str: string) => formatString(str, true)

async function purgeInactive(players: any[]) {
    const now = new Date()
    const len = players.length

    let i = 0, counter = 0

    //#region Purge loop
    for (i; i < len; i++) {
        const player = players[i]
        const lo = player?.lastOnline

        if (!lo) {
            players.splice(i, 1)
            counter++

            continue
        }

        // Player's discord is null or empty, delete it.
        // If not, don't purge them.
        if (!player?.linkedID) delete player.linkedID
        else continue

        //#region Purge if inactive on both maps.
        if (lo.aurora && !purged(lo.aurora, now)) continue
        if (lo.nova && !purged(lo.nova, now)) continue

        players.splice(i, 1)
        counter++
        //#endregion
    }
    //#endregion

    console.log(`Purged ${counter} inactive/corrupted players.`)
    await database.setPlayers(players)

    return players
}
//#endregion

export {
    initUpdates
}