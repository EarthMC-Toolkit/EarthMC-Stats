import { setPlayers, getPlayers} from "./database.js"
import * as MC from "./minecraft.js"

type ResidentProfile = {
    name: string
    linkedID: string | number
    lastOnline: {
        nova: any
        aurora: any
    }
}

async function linkPlayer(id: string | number, username: string) {
    getPlayers(true).then(async (players: ResidentProfile[]) => {
        const filter = p => p.name.toLowerCase() == username.toLowerCase()
        const foundResident = players.find(player => filter(player)),
              residentIndex = players.findIndex(player => filter(player))
        
        if (!foundResident) {
            const player = await MC.Players.get(username).catch(() => {})
            const residentObj: ResidentProfile = {
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

        setPlayers(players)
    })
}

async function unlinkPlayer(username: string) {
    getPlayers(true).then(async players => {
        const filter = p => p.name.toLowerCase() == username.toLowerCase()

        const foundPlayer = players.find(player => filter(player)),
              playerIndex = players.findIndex(player => filter(player))
        
        if (!foundPlayer) return
        delete players[playerIndex].linkedID

        setPlayers(players)
    })
}

const lower = (k: string | number) => k.toString().toLowerCase()
async function getLinkedPlayer(identifier: string | number) {
    return getPlayers().then(async players => {
        const foundPlayer = players.find(player => lower(player.name) === lower(identifier) || player.linkedID === identifier)
        return !foundPlayer?.linkedID ? null : foundPlayer
    })
}

export {
    linkPlayer, 
    unlinkPlayer, 
    getLinkedPlayer
}
