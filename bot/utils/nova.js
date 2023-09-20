const db = require("firebase-admin").firestore(),
      residentDataCollection = db.collection("residentData"),
      nationDataCollection = db.collection("nationData"),
      townDataCollection = db.collection("townData"),
      allianceDoc = db.collection("alliances").doc("alliancesDoc"),
      fn = require("./fn"),
      { request } = require("undici")
      
var cache = require('memory-cache')

const novaUrl = 'https://earthmc.net/map/nova/'
const getTownyData = () => request(`${novaUrl}standalone/MySQL_markers.php?marker=_markers_/marker_earth.json`).then(res => res.body.json())
const getOnlinePlayerData = () => request(`${novaUrl}standalone/MySQL_update.php?world=earth`).then(res => res.body.json())

async function getResidents() {
    return cache.get('residents') ?? residentDataCollection.get().then(async snapshot => { 
        return snapshot.docs.flatMap(doc => doc.data().residentArray)
    }).catch(() => {})
}

/**
 * @param { any[] } residents 
 */
async function setResidents(residents) {
    const dividedResidentsArray = fn.divideArray(residents, 7)
    let counter = 0

    cache.put('residents', residents)
    for (const resident of dividedResidentsArray) {      
        counter++
        residentDataCollection.doc("residentArray" + counter).set({ residentArray: resident })
    }
}

async function getNations() {
    return cache.get('nations') ?? nationDataCollection.get().then(async snapshot => { 
        return snapshot.docs.flatMap(doc => doc.data().nationArray)
    }).catch(() => {})
}

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

    cache.put('nations', nations)
    for (const nation of dividedNationsArray) {      
        counter++
        nationDataCollection.doc("nationArray" + counter).set({ nationArray: nation })
    }
}

async function getTowns() {
    return cache.get('towns') ?? townDataCollection.get().then(async snapshot => { 
        return snapshot.docs.flatMap(doc => doc.data().townArray)
    }).catch(() => {})
}

/**
 * @param { any[] } towns 
 */
async function setTowns(towns) {
    const dividedTownsArray = fn.divideArray(towns, 6)
    let counter = 0

    cache.put('towns', towns)
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
            var allianceNations = nations.filter(nation => foundAlliance.nations.find(n => n.toLowerCase() == nation.name.toLowerCase())),
                onlineInAlliance = []
            
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
    
                    const index = alliances.findIndex(a => a.allianceName == foundAlliance.allianceName)
    
                    foundAlliance["rank"] = index + 1
                    foundAlliance["online"] = onlineInAlliance
                }

                return foundAlliance
            }) // returning out of data
        }) // returning out of nations
    }) // returning out of alliances
}

async function getAlliances() {
    const cachedAlliances = cache.get('alliances')

    if (!cachedAlliances) {
        return allianceDoc.get()
            .then(async doc => doc.data().allianceArray)
            .catch(console.log)
    }

    return cachedAlliances
}

/**
 * @param { any[] } alliances 
 */
async function setAlliances(alliances) {
    cache.put('alliances', alliances)
    allianceDoc.set({ allianceArray: alliances })
}

module.exports = {
    getResidents, setResidents,
    getNation, getNations, setNations, 
    getTownyData, getOnlinePlayerData, 
    getTowns, setTowns,
    getAlliance, getAlliances, setAlliances
}