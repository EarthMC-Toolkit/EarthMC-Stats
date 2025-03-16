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

    const dividedTownsArray = divideArray(towns, 6)
    let counter = 0

    const batch = db.batch()
    for (const towns of dividedTownsArray) {
        counter++

        const townRef = townDataCollection().doc(`townArray${counter}`)
        batch.set(townRef, { townArray: towns })
    }

    await batch.commit()
}

const length = (x: unknown[]) => x.length

export async function getAlliance(name: string) {
    const alliances = await getAlliances() as DBAlliance[]
    if (!alliances) return null

    const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == name.toLowerCase())
    if (!foundAlliance) return null

    const nations = await getNations()
    if (!nations) return null

    const opData = await getOnlinePlayerData()

    // Get nations that are in the inputted alliance.
    const allianceNations = nations.filter(nation => foundAlliance.nations.some(n => n.toLowerCase() == nation.name.toLowerCase()))
    const len = allianceNations.length

    for (let i = 0; i < len; i++) {
        const n = allianceNations[i]

        foundAlliance.wealth += n.wealth

        if (!opData) continue

        const onlineInNation = n.residents.filter(res => opData.players.some(op => op.name == res))
        foundAlliance.online = fastMerge([], onlineInNation)
    }

    // Only get rank if 2 or more alliances exist.
    const alliancesLen = alliances.length
    if (alliancesLen > 1) {
        for (let i = 0; i < alliancesLen; i++) {
            const alliance = alliances[i]

            let currentAllianceResidents = 0
            let currentAllianceArea = 0
            let currentAllianceTowns = 0
            
            const allianceNationsLen = alliance.nations.length
            for (let j = 0; j < allianceNationsLen; j++) {
                const allianceNation = alliance.nations[j]

                const foundNation = nations.find(n => n.name == allianceNation)                       
                if (!foundNation) continue

                currentAllianceResidents += foundNation.residents.length
                currentAllianceArea += foundNation.area
                currentAllianceTowns += foundNation.towns.length
            }

            alliance.residents = currentAllianceResidents
            alliance.towns = currentAllianceTowns
            alliance.area = currentAllianceArea
        }
        
        //#region Default sort
        sortByOrder(alliances, [
            { key: "residents" }, 
            { key: "area" },
            { key: "nations", callback: length }, 
            { key: "towns", callback: length }
        ])
        //#endregion

        foundAlliance.rank = alliances.findIndex(a => a.allianceName == foundAlliance.allianceName) + 1
    }

    return foundAlliance
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