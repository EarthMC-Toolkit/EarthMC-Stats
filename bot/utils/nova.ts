import { divideArray, sortByOrder } from "./fn.js"
import { cache } from '../constants.js'
import { request } from "undici"

import { db } from "../constants.js"
import type { MapResponse, PlayersResponse } from "earthmc"

const novaUrl = 'https://earthmc.net/map/nova/'
const getTownyData = async () => {
    const res = await request(`${novaUrl}standalone/MySQL_markers.php?marker=_markers_/marker_earth.json`)
    return await res.body.json() as MapResponse
}

const getOnlinePlayerData = async () => {
    const res = await request(`${novaUrl}standalone/MySQL_update.php?world=earth`)
    return await res.body.json() as PlayersResponse
}

async function getResidents() {
    const residentDataCollection = db.collection("residentData")
    return cache.get('residents') ?? residentDataCollection.get().then(async snapshot => { 
        return snapshot.docs.flatMap(doc => doc.data().residentArray)
    }).catch(() => {})
}

async function setResidents(residents: any[]) {
    const residentDataCollection = db.collection("residentData")

    const dividedResidentsArray = divideArray(residents, 7)
    let counter = 0

    cache.set('residents', residents)
    for (const resident of dividedResidentsArray) {      
        counter++
        residentDataCollection.doc("residentArray" + counter).set({ residentArray: resident })
    }
}

async function getNations() {
    const nationDataCollection = db.collection("nationData")
    return cache.get('nations') ?? nationDataCollection.get().then(async snapshot => { 
        return snapshot.docs.flatMap(doc => doc.data().nationArray)
    }).catch(() => {})
}

const getNation = (name: string) => getNations().then(arr => { 
    const nation = arr.find(n => n.name.toLowerCase() == name.toLowerCase())
    return nation ?? null
}).catch(() => {})

async function setNations(nations: any[]) {
    const nationDataCollection = db.collection("nationData")

    const dividedNationsArray = divideArray(nations, 4)
    let counter = 0

    cache.set('nations', nations)
    for (const nation of dividedNationsArray) {      
        counter++
        nationDataCollection.doc("nationArray" + counter).set({ nationArray: nation })
    }
}

async function getTowns() {
    const townDataCollection = db.collection("townData")

    return cache.get('towns') ?? townDataCollection.get().then(async snapshot => { 
        return snapshot.docs.flatMap(doc => doc.data().townArray)
    }).catch(() => {})
}

async function setTowns(towns: any[]) {
    const townDataCollection = db.collection("townData")
    
    const dividedTownsArray = divideArray(towns, 6)
    let counter = 0

    cache.set('towns', towns)
    for (const towns of dividedTownsArray) {
        counter++
        townDataCollection.doc("townArray" + counter).set({ townArray: towns })
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
            
            // Compare against 
            return getOnlinePlayerData().then(async (data: any) => {
                allianceNations.forEach(allianceNation => {
                    const onlineInNation = allianceNation.residents.filter(res => data.players.find(op => op.account == res))
                    onlineInAlliance = onlineInAlliance.concat(onlineInNation)
                })
    
                // Only get rank if 2 or more alliances exist.
                if (alliances.length >= 1) {          
                    alliances.forEach(alliance => {
                        let currentAllianceResidents = 0
                        let currentAllianceArea = 0
                        let currentAllianceTowns = 0
                            
                        for (const allianceNation of alliance.nations) {
                            const foundNation = nations.find(nation => nation.name == allianceNation)                       
                            if (!foundNation) continue
        
                            currentAllianceResidents += foundNation.residents.length
                            currentAllianceArea += foundNation.area
                            currentAllianceTowns += foundNation.towns.length
                        }
                        
                        alliance["residents"] = currentAllianceResidents
                        alliance["towns"] = currentAllianceTowns
                        alliance["area"] = currentAllianceArea
                    })
                    
                    //#region Default sort
                    sortByOrder(alliances, [
                        { key: "residents" }, 
                        { key: "area" },
                        { key: "nations", callback: length }, 
                        { key: "towns", callback: length }
                    ])
                    //#endregion
    
                    const index = alliances.findIndex(a => a.allianceName == foundAlliance.allianceName)
    
                    foundAlliance["rank"] = index + 1
                    foundAlliance["online"] = onlineInAlliance
                }

                return foundAlliance
            })
        })
    })
}

async function getAlliances() {
    const cachedAlliances = cache.get('alliances')
    if (!cachedAlliances) {
        const allianceDoc = db.collection("alliances").doc("alliancesDoc")

        return allianceDoc.get()
            .then(async doc => doc.data().allianceArray)
            .catch(console.log)
    }

    return cachedAlliances
}

async function setAlliances(alliances: any[]) {
    cache.set('alliances', alliances)

    const allianceDoc = db.collection("alliances").doc("alliancesDoc")
    return allianceDoc.set({ allianceArray: alliances })
}

const length = (x: string | any[]) => x.length

export {
    getResidents, setResidents,
    getNation, getNations, setNations, 
    getTownyData, getOnlinePlayerData, 
    getTowns, setTowns,
    getAlliance, getAlliances, setAlliances
}