import { setPlayers, getPlayers} from "./database.js"
import { Players } from "./minecraft.js"

import { Timestamp } from "firebase-admin/firestore"

type ResidentProfile = {
    name: string
    linkedID: string | number
    lastOnline: {
        nova: Date | Timestamp
        aurora: Date | Timestamp
    }
}

const strEqual = (p: { name: string }, name: string) => 
    p.name.toLowerCase() == name.toLowerCase()

async function linkPlayer(id: string | number, username: string) {
    getPlayers(true).then(async (players: ResidentProfile[]) => {

        const foundResident = players.find(p => strEqual(p, username))
        const residentIndex = players.findIndex(p => strEqual(p, username))
        
        if (!foundResident) {
            const player = await Players.get(username).catch(() => {})
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

        const foundPlayer = players.find(player => filter(player))
        const playerIndex = players.findIndex(player => filter(player))
        
        if (!foundPlayer) return
        delete players[playerIndex].linkedID

        setPlayers(players)
    })
}

const lower = (k: string | number) => k.toString().toLowerCase()
async function getLinkedPlayer(identifier: string | number) {
    const players = await getPlayers() as ResidentProfile[]
    if (!players) return null

    const foundPlayer = players.find(player => lower(player.name) === lower(identifier) || player.linkedID === identifier)
    return !foundPlayer?.linkedID ? null : foundPlayer
}

export {
    linkPlayer, 
    unlinkPlayer, 
    getLinkedPlayer
}
