import { cache } from '../constants.js'
import { request } from "undici"

import  { 
    endpoint,
    type SquaremapMapResponse, 
    type SquaremapPlayersResponse
} from "earthmc"

import type { 
    DBAlliance, DBResident, 
    DBSquaremapNation, DBSquaremapTown
} from '../types.js'

import { 
    divideArray, 
    fastMerge,
    sortByOrder 
} from "./fn.js"

import { db } from "../constants.js"

const auroraDoc = () => db.collection("aurora").doc("data")

const residentDataCollection = () => auroraDoc().collection("residentData")
const nationDataCollection = () => auroraDoc().collection("nationData")
const townDataCollection = () => auroraDoc().collection("townData")
const allianceCollection = () => auroraDoc().collection("alliances").doc("alliancesDoc")

const auroraUrl = 'https://map.earthmc.net'

export const getMapData = () => endpoint.mapData<SquaremapMapResponse>('aurora')

export const getOnlinePlayerData = async () => {
    const res = await request(`${auroraUrl}/tiles/players.json`)
    return await res.body.json() as SquaremapPlayersResponse
}

export async function getResidents(): Promise<DBResident[]> {
    const cachedResidents = cache.get('aurora_residents')
    if (cachedResidents) return cachedResidents

    const snapshot = await residentDataCollection().get()
    return snapshot.docs.flatMap(doc => doc.data().residentArray)
}

export async function setResidents(residents: DBResident[]) {
    cache.set('aurora_residents', residents)

    const dividedResidentsArray = divideArray(residents, 3)
    let counter = 0

    const batch = db.batch()

    for (const resident of dividedResidentsArray) {      
        counter++

        const residentRef = residentDataCollection().doc(`residentArray${counter}`)
        batch.set(residentRef, { residentArray: resident })
    }

    await batch.commit()
}

export const getNations = async (): Promise<DBSquaremapNation[]> => cache.get('aurora_nations') ?? nationDataCollection().get().then(async snapshot => {
    return snapshot.docs.flatMap(doc => doc.data().nationArray)
})

export const getNation = (nationName: string): Promise<DBSquaremapNation> => getNations().then(arr => { 
    const nation = arr.find(n => n.name.toLowerCase() == nationName.toLowerCase())
    return nation ?? null
})

export async function setNations(nations: DBSquaremapNation[]) {
    cache.set('aurora_nations', nations)

    //const dividedNationsArray = divideArray(nations, 2)
    //let counter = 0

    nationDataCollection()
        .doc("nationArray1")
        .set({ nationArray: nations })
}

export const getTowns = async (): Promise<DBSquaremapTown[]> => cache.get('aurora_towns') ?? townDataCollection().get()
    .then(async snapshot => snapshot.docs.flatMap(doc => doc.data().townArray))

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

const length = (x: unknown[]) => x.length

export async function getAlliance(name: string) {
    const alliances = await getAlliances() as DBAlliance[]
    if (!alliances) return null

    const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == name.toLowerCase())
    if (!foundAlliance) return null

    const nations = await getNations()
    if (!nations) return null

    // Get nations that are in the input alliance.
    const allianceNations = nations.filter(nation => foundAlliance.nations.some(n => n.toLowerCase() == nation.name.toLowerCase()))
    const len = allianceNations.length

    const opData = await getOnlinePlayerData()
    for (let i = 0; i < len; i++) {
        const n = allianceNations[i]

        if (opData) {
            const onlineInNation = n.residents.filter(res => opData.players.some(op => op.name == res))
            foundAlliance.online = fastMerge([], onlineInNation)
        }

        //foundAlliance.wealth += n.wealth
    }

    // Only get rank if 2 or more alliances exist.
    if (alliances.length > 1) {
        foundAlliance.rank = getAllianceRank(foundAlliance.allianceName, alliances, nations)
    }

    return foundAlliance
}

export function getAllianceRank(allianceName: string, alliances: DBAlliance[], nations: DBSquaremapNation[]) {
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

    return alliances.findIndex(a => a.allianceName == allianceName) + 1
}

export async function getAlliances(skipCache = false): Promise<DBAlliance[]> {
    const cached: DBAlliance[] = cache.get('aurora_alliances')
    const skip = !skipCache ? cached : null

    return skip ?? allianceCollection().get().then(async doc => { 
        return doc.data().allianceArray 
    }).catch(() => null)
}

export async function setAlliances(alliances: DBAlliance[]) {
    cache.set('aurora_alliances', alliances)
    return allianceCollection().set({ allianceArray: alliances })
}