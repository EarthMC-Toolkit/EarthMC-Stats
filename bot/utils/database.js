const fn = require("./fn"),
      db = require("firebase-admin").firestore(),
      playerCollection = db.collection("players"),
      cache = require('memory-cache')

const getPlayers = async (skipCache=false) => {
    const cached = cache.get('players'),
          skip = !skipCache ? cached : null

    return skip ?? playerCollection.get().then(async snapshot => { 
        return snapshot.docs.flatMap(doc => doc.data().playerArray)
    }).catch(() => {})
}

const getPlayerInfo = (name, includeTimestamps=true) => getPlayers().then(players => {
    if (!players) return null

    const player = players.find(p => p.name.toLowerCase() == name.toLowerCase())
    if (!player) return null

    player["discord"] = player.linkedID

    if (includeTimestamps) {
        player["lastOnline"] = {
            nova: fn.unixFromDate(player.lastOnline.nova),
            aurora: fn.unixFromDate(player.lastOnline.aurora)
        }
    }
    
    return player
})

async function setPlayers(players) {
    cache.put('players', players, 298*1000)

    const dividedPlayerArray = fn.divideArray(players, 8)
    let counter = 0

    for (const array of dividedPlayerArray) {      
        counter++
        playerCollection.doc("playerArray" + counter).set({ playerArray: array })
    }
}

module.exports = {
    getPlayerInfo, 
    getPlayers, setPlayers, 
    Nova: require("./nova"),
    Aurora: require("./aurora")
}