/**
* @file Util module for interacting with Firestore
* @author Owen3H
*/

import { cache } from '../constants.js'
import { request } from "undici"

import type { 
    SquaremapMapResponse, 
    SquaremapPlayersResponse
} from "earthmc"

import { divideArray, sortByOrder } from "./fn.js"
import { db } from "../constants.js"
import type { DBAlliance, DBResident, DBSquaremapNation, DBSquaremapTown } from '../types.js'

const auroraDoc = () => db.collection("aurora").doc("data")

const residentDataCollection = () => auroraDoc().collection("residentData")
const nationDataCollection = () => auroraDoc().collection("nationData")
const townDataCollection = () => auroraDoc().collection("townData")
const allianceCollection = () => auroraDoc().collection("alliances").doc("alliancesDoc")

const auroraUrl = 'https://map.earthmc.net'
const getTownyData = async () => {
    const res = await request(`${auroraUrl}/tiles/minecraft_overworld/markers.json`)
    return await res.body.json() as SquaremapMapResponse
}

const getOnlinePlayerData = async () => {
    const res = await request(`${auroraUrl}/tiles/players.json`)
    return await res.body.json() as SquaremapPlayersResponse
}

async function getResidents() {
    return cache.get('aurora_residents') ?? residentDataCollection().get().then(async snapshot => { 
        return snapshot.docs.flatMap(doc => doc.data().residentArray)
    }).catch(() => {})
}

async function setResidents(residents: DBResident[]) {
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

const getNations = async (): Promise<DBSquaremapNation[]> => cache.get('aurora_nations') ?? nationDataCollection().get().then(async snapshot => {
    return snapshot.docs.flatMap(doc => doc.data().nationArray)
})

const getNation = (nationName: string): Promise<DBSquaremapNation> => getNations().then(arr => { 
    const nation = arr.find(n => n.name.toLowerCase() == nationName.toLowerCase())
    return nation ?? null
})

async function setNations(nations: DBSquaremapNation[]) {
    cache.set('aurora_nations', nations)

    //const dividedNationsArray = divideArray(nations, 2)
    //let counter = 0

    nationDataCollection()
        .doc("nationArray1")
        .set({ nationArray: nations })
}

const getTowns = async (): Promise<DBSquaremapTown[]> => cache.get('aurora_towns') ?? townDataCollection().get()
    .then(async snapshot => snapshot.docs.flatMap(doc => doc.data().townArray))

async function setTowns(towns: DBSquaremapTown[]) {
    cache.set('aurora_towns', towns)

    const dividedTownsArray = divideArray(towns, 6)
    let counter = 0

    const batch = db.batch()

    for (const towns of dividedTownsArray) {
        counter++

        const townRef = townDataCollection().doc("townArray" + counter)
        batch.set(townRef, { townArray: towns })
    }

    await batch.commit()
}

async function getAlliance(name: string) {
    const alliances = await getAlliances() as DBAlliance[]
    if (!alliances) return null

    const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == name.toLowerCase())
    if (!foundAlliance) return null

    const nations = await getNations()
    if (!nations) return null

    // Get nations that are in the inputted alliance.
    const allianceNations = nations.filter(nation => foundAlliance.nations.find(n => n.toLowerCase() == nation.name.toLowerCase()))
    let onlineInAlliance = []
    
    let totalWealth = 0

    const data = await getOnlinePlayerData()
    if (!data) return null
    
    allianceNations.forEach(n => {
        const onlineInNation = n.residents.filter(res => data.players.find(op => op.name == res))
        onlineInAlliance = onlineInAlliance.concat(onlineInNation)

        totalWealth += n.wealth
    })

    // Only get rank if 2 or more alliances exist.
    const alliancesLen = alliances.length
    if (alliancesLen >= 1) {      
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

            alliance["residents"] = currentAllianceResidents
            alliance["towns"] = currentAllianceTowns
            alliance["area"] = currentAllianceArea
        }
        
        //#region Default sort
        sortByOrder(alliances, [
            { key: "residents" }, 
            { key: "area" },
            { key: "nations", callback: length }, 
            { key: "towns", callback: length }
        ])
        //#endregion

        const index = alliances.findIndex(a => a.allianceName == foundAlliance.allianceName) as number
        foundAlliance.rank = index + 1
        foundAlliance.online = onlineInAlliance
        foundAlliance.wealth = totalWealth
    }

    return foundAlliance
}

async function getAlliances(skipCache = false): Promise<DBAlliance[]> {
    const cached: DBAlliance[] = cache.get('aurora_alliances')
    const skip = !skipCache ? cached : null

    return skip ?? allianceCollection().get().then(async doc => { 
        return doc.data().allianceArray 
    }).catch(() => null)
}

async function setAlliances(alliances: DBAlliance[]) {
    cache.set('aurora_alliances', alliances)
    return allianceCollection().set({ allianceArray: alliances })
}

const length = x => x.length

export {
    getResidents, setResidents,
    getNation, getNations, setNations, 
    getTownyData, getOnlinePlayerData, 
    getTowns, setTowns,
    getAlliance, getAlliances, setAlliances
}