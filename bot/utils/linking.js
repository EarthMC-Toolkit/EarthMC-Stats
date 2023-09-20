const database = require("./database"),
      MC = require("./minecraft")

async function linkPlayer(id, username) {
    database.getPlayers(true).then(async players => {
        const filter = p => p.name.toLowerCase() == username.toLowerCase()
        const foundResident = players.find(player => filter(player)),
              residentIndex = players.findIndex(player => filter(player))
        
        if (!foundResident) {
            const player = await MC.Players.get(username).catch(() => {})
            
            const residentObj = {
                name: player ? player.name : username,
                linkedID: id,
                lastOnline: {
                    nova: null,
                    aurora: null
                }
            }
            
            players.push(residentObj)
        } 
        else players[residentIndex].linkedID = id

        database.setPlayers(players)
    })
}

async function unlinkPlayer(username) {
    database.getPlayers(true).then(async players => {
        const filter = p => p.name.toLowerCase() == username.toLowerCase()

        const foundPlayer = players.find(player => filter(player)),
              playerIndex = players.findIndex(player => filter(player))
        
        if (!foundPlayer) return
        delete players[playerIndex].linkedID

        database.setPlayers(players)
    })
}

async function getLinkedPlayer(identifier) {
    return database.getPlayers().then(async players => {
        const foundPlayer = players.find(player => player.name.toLowerCase() === identifier.toLowerCase() || player.linkedID === identifier)
        return !foundPlayer?.linkedID ? null : foundPlayer
    })
}

module.exports = {
    linkPlayer, 
    unlinkPlayer, 
    getLinkedPlayer
}
