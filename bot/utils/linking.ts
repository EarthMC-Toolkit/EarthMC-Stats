import { setPlayers, getPlayers } from "./database.js"
import { Players } from "./minecraft.js"
import type { DBPlayer } from "../types.js"

const lower = (k: string | number) => k.toString().toLowerCase()
const strEqual = (p: { name: string }, name: string) => 
    p.name.toLowerCase() == name.toLowerCase()

async function getLinkedPlayer(identifier: string | number) {
    const players = await getPlayers() as DBPlayer[]
    if (!players) return null

    const foundPlayer = players.find(p => lower(p.name) === lower(identifier) || p.linkedID === identifier)
    return !foundPlayer?.linkedID ? null : foundPlayer
}

async function linkPlayer(id: string | number, username: string) {
    getPlayers(true).then(async (players: DBPlayer[]) => {

        const foundResident = players.find(p => strEqual(p, username))
        const residentIndex = players.findIndex(p => strEqual(p, username))
        
        if (!foundResident) {
            const player = await Players.get(username).catch(() => {})
            const residentObj: DBPlayer = {
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
    const players = await getPlayers(true)
    if (!players) return // TODO: Throw proper err

    const foundPlayer = players.find(p => p.name.toLowerCase() == username.toLowerCase())
    const playerIndex = players.findIndex(p => p.name.toLowerCase() == username.toLowerCase())
    
    if (!foundPlayer) return
    delete players[playerIndex].linkedID

    setPlayers(players)
}

export {
    linkPlayer, 
    unlinkPlayer, 
    getLinkedPlayer
}
