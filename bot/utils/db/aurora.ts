import  { 
    endpoint,
    type RawPlayerStatsV3,
    type SquaremapMapResponse,
    type SquaremapPlayersResponse
} from "earthmc"

import { Timestamp } from "firebase-admin/firestore"

import { db, cache } from '../../constants.js'

import { 
    divideArray, 
    fastMerge,
    sortByOrder 
} from "../fn.js"

import type {
    DBAlliance, DBAllianceExtended, DBResident, 
    DBSquaremapNation, DBSquaremapTown
} from '../../types.js'

const auroraDoc = () => db.collection("aurora").doc("data")

const residentDataCollection = () => auroraDoc().collection("residentData")
const nationDataCollection = () => auroraDoc().collection("nationData")
const townDataCollection = () => auroraDoc().collection("townData")

const allianceCollection = () => auroraDoc().collection("alliances").doc("alliancesDoc")
const playerStatsCollection = () => auroraDoc().collection("playerStats").doc("playerStatsDoc")

export const getMapData = () => endpoint.mapData<SquaremapMapResponse>('aurora')
export const getOnlinePlayerData = () => endpoint.playerData<SquaremapPlayersResponse>('aurora')

//export const AURORA_MAP_URL = 'https://map.earthmc.net'
// export const getOnlinePlayerData = async () => {
//     const res = await request(`${AURORA_MAP_URL}/tiles/players.json`)
//     return await res.body.json() as SquaremapPlayersResponse
// }

export async function getResidents(): Promise<DBResident[]> {
    const cachedResidents = cache.get('aurora_residents')
    if (cachedResidents) return cachedResidents

    const snapshot = await residentDataCollection().get()
    return snapshot.docs.flatMap(doc => doc.data().residentArray)
}

export async function setResidents(residents: DBResident[]) {
    cache.set('aurora_residents', residents)

    const dividedResidentsArray = divideArray(residents, 3)
    const batch = db.batch()

    let counter = 0
    for (const resident of dividedResidentsArray) {      
        counter++

        const residentRef = residentDataCollection().doc(`residentArray${counter}`)
        batch.set(residentRef, { residentArray: resident })
    }

    await batch.commit()
}

export const getNations = async (): Promise<DBSquaremapNation[]> => {
    return cache.get('aurora_nations') ?? nationDataCollection().get().then(async snapshot =>
        snapshot.docs.flatMap(doc => doc.data().nationArray)
    )
}

export const getNation = (nationName: string): Promise<DBSquaremapNation> => getNations().then(arr => { 
    const nation = arr.find(n => n.name.toLowerCase() == nationName.toLowerCase())
    return nation ?? null
})

export async function setNations(nations: DBSquaremapNation[]) {
    cache.set('aurora_nations', nations)

    nationDataCollection()
        .doc("nationArray1")
        .set({ nationArray: nations })
}

export const getTowns = async (): Promise<DBSquaremapTown[]> => {
    return cache.get('aurora_towns') ?? townDataCollection().get().then(async snapshot => 
        snapshot.docs.flatMap(doc => doc.data().townArray)
    )
}

export async function setTowns(towns: DBSquaremapTown[]) {
    cache.set('aurora_towns', towns)

    const dividedTownsArray = divideArray(towns, 8)
    let counter = 0

    const batch1 = db.batch()
    const batch2 = db.batch()

    for (const towns of dividedTownsArray) {
        counter++

        const townRef = townDataCollection().doc(`townArray${counter}`)
        if (counter > 4) {
            batch2.set(townRef, { townArray: towns })
        } else {
            batch1.set(townRef, { townArray: towns })
        }
    }

    await batch1.commit()
    await batch2.commit()
}

const length = <T>(x: string | Array<T>) => x.length

/**
 * Overwrites the alliances document with updated alliances data.
 * @param alliances All existing alliances, including ones we just changed.
 * @param changed The indexes of the alliances that changed.
 */
export async function setAlliances(alliances: DBAlliance[], changed: number[]) {
    if (!Array.isArray(alliances)) {
        console.warn("Attempted to overwrite alliances with non-array type.")
        return
    }

    if (alliances.length < 1) {
        console.warn("Attempted to overwrite alliances with empty array!")
        return
    }

    // TODO: This could be slow, determine whether it's truly necessary to typecheck each alliance.
    //       If we validate only the alliance(s) that we updated, the two checks above should suffice.
    const allValid = alliances.every(a => !!a && validDBAlliance(a))
    if (!allValid) {
        console.warn("Attempted to overwrite alliances, but not all of them satisified DBAlliance.")
        return
    }

    // TODO: Implement this
    // const nations = await getNations()
    // alliances.forEach(a => {
    //     const computedAlliances = computeAlliances(alliances, nations)
    //     a.rank = getAllianceRank(a, computedAlliances)
    // })

    if (changed?.length > 0) {
        const now = Timestamp.now()
        changed.forEach(idx => {
            alliances[idx].lastUpdated = now
        })
    }

    cache.set('aurora_alliances', alliances)
    return allianceCollection().set({ allianceArray: alliances })
}

export async function getAlliances(skipCache = false): Promise<DBAlliance[]> {
    const cached: DBAlliance[] = cache.get('aurora_alliances')
    if (cached && !skipCache) return cached

    return allianceCollection().get().then(async doc => { 
        return doc.data().allianceArray
    }).catch(e => { console.warn(`Error getting alliances:\n` + e); return null })
}

// export async function getAlliancesComputed(skipCache = false): Promise<DBAlliance[]> {
//     const cached: DBAlliance[] = cache.get('aurora_alliances_computed')
//     if (cached && !skipCache) return cached

//     const alliances = await getAlliances(skipCache)

//     const nations = await getNations()
//     if (!nations) return null

//     return computeAlliances(alliances, nations)
// }

type AllianceGetResult = {
    foundAlliance: DBAllianceExtended
    alliances: DBAlliance[]
    nations: DBSquaremapNation[]
}

export async function getAlliance(name: string): Promise<AllianceGetResult> {
    // TODO: Handle these three errors instead null - throw with msg instead?
    const alliances = await getAlliances() as DBAlliance[]
    if (!alliances) return { foundAlliance: null, alliances: null, nations: null }

    const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == name.toLowerCase()) as DBAllianceExtended
    if (!foundAlliance) return { foundAlliance: null, alliances, nations: null }

    const nations = await getNations()
    if (!nations) return { foundAlliance, alliances, nations: null }

    // Get nations that are in the input alliance.
    const allianceNations = nations.filter(nation => foundAlliance.nations.some(n => n.toLowerCase() == nation.name.toLowerCase()))
    const len = allianceNations.length

    const opData = await getOnlinePlayerData()
    for (let i = 0; i < len; i++) {
        const n = allianceNations[i]

        if (opData?.players) {
            const opNames = new Set(opData.players.map(op => op.name))
            const onlineInNation = n.residents.filter(res => opNames.has(res))
            foundAlliance.online = fastMerge(foundAlliance.online ?? [], onlineInNation)
        }

        //foundAlliance.wealth += n.wealth
    }

    // Only get rank if 2 or more alliances exist.
    // if (alliances.length > 1) {
    //     const computedAlliances = computeAlliances(alliances, nations)
    //     foundAlliance.rank = getAllianceRank(foundAlliance, computedAlliances)
    // }

    return { foundAlliance, alliances, nations }
}

export function getAllianceRank(alliance: DBAlliance, computedAlliances: DBAlliance[]) {
    return computedAlliances.findIndex(a => a.allianceName === alliance.allianceName) + 1
}

/**
 * Loops through the nations of every alliance specified within `alliances` and adds up values like
 * residents, towns and area using the info provided by `nations`. Finally, it sorts them in a custom order.
 * @param alliances The alliances to compute.
 * @param nations The nations to use when adding up alliance values.
 */
export function computeAlliances(alliances: DBAlliance[], nations: DBSquaremapNation[]) {
    const alliancesLen = alliances.length
    for (let i = 0; i < alliancesLen; i++) {
        const alliance = alliances[i]
        const curAllianceInfo = {
            residents: 0,
            towns: 0,
            area: 0
        }
        
        const allianceNationsLen = alliance.nations.length
        for (let j = 0; j < allianceNationsLen; j++) {
            const allianceNation = alliance.nations[j]

            const foundNation = nations.find(n => n.name == allianceNation)                       
            if (!foundNation) continue

            curAllianceInfo.residents += foundNation.residents.length
            curAllianceInfo.towns += foundNation.towns.length
            curAllianceInfo.area += foundNation.area
        }

        alliance.residents = curAllianceInfo.residents
        alliance.towns = curAllianceInfo.towns
        alliance.area = curAllianceInfo.area
    }
    
    //#region Default sort
    sortByOrder(alliances, [
        { key: "residents" }, 
        { key: "area" },
        { key: "nations", callback: length }, 
        { key: "towns", callback: length }
    ])
    //#endregion

    return alliances
}

function validDBAlliance(alliance: unknown): alliance is DBAlliance {
    const isObj = typeof alliance === 'object' && !Array.isArray(alliance)
    if (!isObj) return false

    const name = alliance['allianceName']
    const validName = !!name && typeof name === 'string'
    if (!validName) return false

    const nations = alliance['nations']
    const validNations = !!nations && Array.isArray(nations)
    if (!validNations) return false

    return true
}

//#region Player Stats
export async function getPlayerStats(skipCache = false): Promise<RawPlayerStatsV3> {
    const cached: RawPlayerStatsV3 = cache.get('aurora_player_stats')
    const skip = !skipCache ? cached : null

    return skip ?? playerStatsCollection().get().then(async doc => { 
        return doc.data()
    }).catch(() => null)
}

export async function setPlayerStats(playerStats: RawPlayerStatsV3) {
    cache.set('aurora_player_stats', playerStats)
    return playerStatsCollection().set(playerStats)
}
//#endregion