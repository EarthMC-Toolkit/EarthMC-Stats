//#region Imports
import { 
    formatString,
    OfficialAPI,
    type RawPlayerStatsV3,
    type SquaremapOnlinePlayer
} from "earthmc"

import { 
    Timestamp
} from "firebase-admin/firestore"

import { 
    type TextChannel,
    Colors, EmbedBuilder 
} from "discord.js"

import { 
    getClient, 
    AURORA,
    lastSeenPlayers,
    getProduction
} from "./constants.js"

import {
    api, database,
    daysBetween, devsFooter
} from "./utils/index.js"

import { 
    type MapInstance, type ResidentRank,
    type DBAlliance, type DBResident, type DBPlayer,
    type SeenPlayer
} from "./types.js"
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
        const alliance = alliances[i]

        const existing = nations.filter(n => alliance.nations.includes(n.name))
        if (existing.length > 1) alliance.nations = existing.map(n => n.name)
        else {
            // Bring back disband logic here if desired in future.
            console.log(`Alliance '${alliance.allianceName}' has no nations.`)
        }

        //#region Validate all non-default invites.
        const noInvite = "No discord invite has been set for this alliance"
        if (alliance.discordInvite != noInvite) {
            // Invalid or will expire, set it back to none.
            getClient().fetchInvite(alliance.discordInvite)
                .then(inv => { if (inv.maxAge > 0) alliance.discordInvite = noInvite })
                .catch(err => { if (err.code == 10006) alliance.discordInvite = noInvite })
        }
        //#endregion
    }

    if (len > 1) {
        const computedAlliances = map.db.computeAlliances(alliances, nations)
        alliances.forEach(a => {
            a.rank = map.db.getAllianceRank(a, computedAlliances)
        })
    }

    await map.db.setAlliances(alliances, null) // No need to set lastUpdated - auto stuff would confuse editors.
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
                aurora: opInDB?.lastOnline?.aurora ?? null
            }
        } satisfies DBPlayer
        
        player.lastOnline[mapName] = now

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

            if (rank == "Mayor" && currentTown.flags.capital) {
                rank = "Nation Leader"
            }
            
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

    const opNames = new Set<string>()
    const now = Date.now()
    
    ops.forEach(op => {
        const seen = lastSeenPlayers.get(op.name)

        op['timesVanished'] = seen ? seen.timesVanished : 0
        op['timestamp'] = now

        lastSeenPlayers.set(op.name, op as SeenPlayer)
        opNames.add(op.name)
    })

    for (const p of lastSeenPlayers.values()) {
        const newOnline = opNames.has(p.name)
        if (p.online && !newOnline) p.timesVanished++

        p.online = newOnline
    }
}
//#endregion

//#region Helper Methods
const isInactive = (timestamp: Timestamp, now: Date) => {
    const loDate = new Date(timestamp.seconds * 1000)
    return daysBetween(loDate, now) > 42
}

const latinize = (str: string) => formatString(str, true)

async function apiPlayerList() {
    const plist = await OfficialAPI.V3.playerList()
    if (plist == null) {
        return []
    }

    return plist.map(p => p.name)
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