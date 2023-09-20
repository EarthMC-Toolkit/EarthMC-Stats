// Util module for interacting with Firestore
const fn = require("./fn"),
      { request } = require("undici"),
      db = require("firebase-admin").firestore(),
      auroraDoc = db.collection("aurora").doc("data"),
      residentDataCollection = auroraDoc.collection("residentData"),
      nationDataCollection = auroraDoc.collection("nationData"),
      townDataCollection = auroraDoc.collection("townData"),
      allianceCollection = auroraDoc.collection("alliances").doc("alliancesDoc")

var cache = require('memory-cache')

const auroraUrl = 'https://earthmc.net/map/aurora/'
const getTownyData = () => request(`${auroraUrl}standalone/MySQL_markers.php?marker=_markers_/marker_earth.json`).then(res => res.body.json())
const getOnlinePlayerData = () => request(`${auroraUrl}standalone/MySQL_update.php?world=earth`).then(res => res.body.json())

async function getResidents() {
    return cache.get('aurora_residents') ?? residentDataCollection.get().then(async snapshot => { 
        return snapshot.docs.flatMap(doc => doc.data().residentArray)
    }).catch(() => {})
}

/**
 * @param { any[] } residents 
 */
async function setResidents(residents) {
    const dividedResidentsArray = fn.divideArray(residents, 12)
    let counter = 0

    cache.put('aurora_residents', residents)
    for (const resident of dividedResidentsArray) {      
        counter++
        residentDataCollection.doc("residentArray" + counter).set({ residentArray: resident })
    }
}

const getNations = async () => cache.get('aurora_nations') ?? nationDataCollection.get().then(async snapshot => {
    return snapshot.docs.flatMap(doc => doc.data().nationArray)
}).catch(() => {})

const getNation = nationName => getNations().then(arr => { 
    const nation = arr.find(n => n.name.toLowerCase() == nationName.toLowerCase())
    return nation ?? null
}).catch(() => {})

/**
 * @param { any[] } nations 
 */
async function setNations(nations) {
    const dividedNationsArray = fn.divideArray(nations, 4)
    let counter = 0

    cache.put('aurora_nations', nations)
    for (const nation of dividedNationsArray) {      
        counter++
        nationDataCollection.doc("nationArray" + counter).set({ nationArray: nation })
    }
}

const getTowns = async () => cache.get('aurora_towns') ?? townDataCollection.get().then(async snapshot => { 
    return snapshot.docs.flatMap(doc => doc.data().townArray)
}).catch(() => {})

/**
 * @param { any[] } towns 
 */
async function setTowns(towns) {
    const dividedTownsArray = fn.divideArray(towns, 6)
    let counter = 0

    cache.put('aurora_towns', towns)
    for (const towns of dividedTownsArray) {
        counter++
        townDataCollection.doc("townArray" + counter).set({ townArray: towns })
    }
}

/**
 * @param { string } name 
 */
async function getAlliance(name) {
    return getAlliances().then(async alliances => {
        if (!alliances) return null

        const foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == name.toLowerCase())
        if (!foundAlliance) return null

        return getNations().then(async nations => {
            // Get nations that are in the inputted alliance.
            const allianceNations = nations.filter(nation => foundAlliance.nations.find(n => n.toLowerCase() == nation.name.toLowerCase()))
            let onlineInAlliance = []
            
            // Compare against 
            return getOnlinePlayerData().then(async data => {
                allianceNations.forEach(allianceNation => {
                    const onlineInNation = allianceNation.residents.filter(res => data.players.find(op => op.account == res))
                    onlineInAlliance = onlineInAlliance.concat(onlineInNation)
                })
    
                // Only get rank if 2 or more alliances exist.
                if (alliances.length >= 1) {          
                    alliances.forEach(alliance => {
                        let currentAllianceResidents = 0,
                            currentAllianceArea = 0,
                            currentAllianceTowns = 0
                            
                        for (const allianceNation of alliance.nations) {
                            const foundNation = nations.find(n => n.name == allianceNation)                       
                            if (!foundNation) continue
        
                            currentAllianceResidents += foundNation.residents.length
                            currentAllianceArea += foundNation.area
                            currentAllianceTowns += foundNation.towns.length
                        }
                        
                        alliance["residents"] = currentAllianceResidents
                        alliance["towns"] = currentAllianceTowns
                        alliance["area"] = currentAllianceArea
                    })
                    
                    // Default sort
                    alliances.sort((a, b) => {
                        if (b.residents > a.residents) return 1
                        if (b.residents < a.residents) return -1
    
                        if (b.area > a.area) return 1
                        if (b.area < a.area) return -1
    
                        if (b.nations.length > a.nations.length) return 1
                        if (b.nations.length < a.nations.length) return -1
    
                        if (b.towns.length > a.towns.length) return 1
                        if (b.towns.length < a.towns.length) return -1
                    })
    
                    var index = alliances.findIndex(a => a.allianceName == foundAlliance.allianceName),
                        rank = index + 1
    
                    foundAlliance["rank"] = rank
                    foundAlliance["online"] = onlineInAlliance
                }

                return foundAlliance
            })
        }) 
    }).then(a => { return a }) 
}

async function getAlliances(skipCache = false) {
    const cached = cache.get('aurora_alliances'),
          skip = !skipCache ? cached : null

    return skip ?? allianceCollection.get().then(async doc => { 
        return doc.data().allianceArray 
    }).catch(() => {})
}

/**
 * @param { any[] } alliances 
 */
async function setAlliances(alliances) {
    cache.put('aurora_alliances', alliances)
    allianceCollection.set({ allianceArray: alliances })
}

module.exports = {
    getResidents, setResidents,
    getNation, getNations, setNations, 
    getTownyData, getOnlinePlayerData, 
    getTowns, setTowns,
    getAlliance, getAlliances, setAlliances
}