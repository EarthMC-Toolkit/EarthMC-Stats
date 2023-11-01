/**
* @file Util module for interacting with Firestore
* @author Owen3H
*/

import * as fn from "./fn.js"
import cache from 'memory-cache'
import { request } from "undici"
import { getFirestore } from 'firebase-admin/firestore'

import { 
    MapResponse,
    type PlayersResponse 
} from "earthmc"

const db = () => getFirestore()
const auroraDoc = () => db().collection("aurora").doc("data")

const residentDataCollection = () => auroraDoc().collection("residentData")
const nationDataCollection = () => auroraDoc().collection("nationData")
const townDataCollection = () => auroraDoc().collection("townData")
const allianceCollection = () => auroraDoc().collection("alliances").doc("alliancesDoc")

const auroraUrl = 'https://earthmc.net/map/aurora/'
const getTownyData = async () => {
    const res = await request(`${auroraUrl}standalone/MySQL_markers.php?marker=_markers_/marker_earth.json`)
    return await res.body.json() as MapResponse
}

const getOnlinePlayerData = async () => {
    const res = await request(`${auroraUrl}standalone/MySQL_update.php?world=earth`)
    return await res.body.json() as PlayersResponse
}

async function getResidents() {
    return cache.get('aurora_residents') ?? residentDataCollection().get().then(async snapshot => { 
        return snapshot.docs.flatMap(doc => doc.data().residentArray)
    }).catch(() => {})
}

async function setResidents(residents: any[]) {
    const dividedResidentsArray = fn.divideArray(residents, 12)
    let counter = 0

    cache.put('aurora_residents', residents)
    for (const resident of dividedResidentsArray) {      
        counter++
        residentDataCollection().doc("residentArray" + counter).set({ residentArray: resident })
    }
}

const getNations = async () => cache.get('aurora_nations') ?? nationDataCollection().get().then(async snapshot => {
    return snapshot.docs.flatMap(doc => doc.data().nationArray)
}).catch(() => {})

const getNation = (nationName: string) => getNations().then(arr => { 
    const nation = arr.find(n => n.name.toLowerCase() == nationName.toLowerCase())
    return nation ?? null
}).catch(() => {})

async function setNations(nations: any[]) {
    const dividedNationsArray = fn.divideArray(nations, 4)
    let counter = 0

    cache.put('aurora_nations', nations)
    for (const nation of dividedNationsArray) {      
        counter++
        nationDataCollection().doc("nationArray" + counter).set({ nationArray: nation })
    }
}

const getTowns = async () => cache.get('aurora_towns') ?? townDataCollection().get().then(async snapshot => { 
    return snapshot.docs.flatMap(doc => doc.data().townArray)
}).catch(() => {})

async function setTowns(towns: any[]) {
    const dividedTownsArray = fn.divideArray(towns, 6)
    let counter = 0

    cache.put('aurora_towns', towns)
    for (const towns of dividedTownsArray) {
        counter++
        townDataCollection().doc("townArray" + counter).set({ townArray: towns })
    }
}

async function getAlliance(name: string) {
    return getAlliances().then(async alliances => {
        if (!alliances) return null

        const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == name.toLowerCase())
        if (!foundAlliance) return null

        return getNations().then(async nations => {
            // Get nations that are in the inputted alliance.
            const allianceNations = nations.filter(nation => foundAlliance.nations.find(n => n.toLowerCase() == nation.name.toLowerCase()))
            let onlineInAlliance = []
            
            return getOnlinePlayerData().then(async (data: any) => {
                allianceNations.forEach(n => {
                    const onlineInNation = n.residents.filter(res => data.players.find(op => op.account == res))
                    onlineInAlliance = onlineInAlliance.concat(onlineInNation)
                })
    
                // Only get rank if 2 or more alliances exist.
                const alliancesLen = alliances.length
                if (alliancesLen >= 1) {      
                    for (let i = 0; i < alliancesLen; i++) {
                        const alliance = alliances[i]

                        let currentAllianceResidents = 0,
                            currentAllianceArea = 0,
                            currentAllianceTowns = 0
                        
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
                    // alliances.sort((a, b) => {
                    //     if (b.residents > a.residents) return 1
                    //     if (b.residents < a.residents) return -1
    
                    //     if (b.area > a.area) return 1
                    //     if (b.area < a.area) return -1
    
                    //     if (b.nations.length > a.nations.length) return 1
                    //     if (b.nations.length < a.nations.length) return -1
    
                    //     if (b.towns.length > a.towns.length) return 1
                    //     if (b.towns.length < a.towns.length) return -1
                    // })

                    const callback = x => x.length
                    fn.sortByOrder(alliances, [
                        { key: "residents", callback }, 
                        { key: "area" }, 
                        { key: "nations", callback }, 
                        { key: "towns", callback }
                    ])
                    //#endregion
    
                    const index = alliances.findIndex(a => a.allianceName == foundAlliance.allianceName) as number
                    foundAlliance["rank"] = index + 1
                    foundAlliance["online"] = onlineInAlliance
                }

                return foundAlliance
            })
        }) 
    })
}

async function getAlliances(skipCache = false) {
    const cached = cache.get('aurora_alliances'),
          skip = !skipCache ? cached : null

    return skip ?? allianceCollection().get().then(async doc => { 
        return doc.data().allianceArray 
    }).catch(() => null)
}

async function setAlliances(alliances: any[]) {
    cache.put('aurora_alliances', alliances)
    allianceCollection().set({ allianceArray: alliances })
}

export {
    getResidents, setResidents,
    getNation, getNations, setNations, 
    getTownyData, getOnlinePlayerData, 
    getTowns, setTowns,
    getAlliance, getAlliances, setAlliances
}