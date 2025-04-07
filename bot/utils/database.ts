import { cache } from '../constants.js'

import { divideArray } from "./fn.js"

import * as Aurora from "./aurora.js"
import * as Nova from "./nova.js"

import { db } from "../constants.js"
import type { 
    DocumentReference, 
    DocumentSnapshot, 
    DocumentData 
} from "firebase-admin/firestore"

import type { DBPlayer } from '../types.js'

export type DocSnapshot = DocumentSnapshot<DocumentData>
export type DocReference = DocumentReference

// type PlayerInfo = {
//     //discord: string | number
//     name: string
//     lastOnline?: {
//         aurora: number
//     }
// }

// const getPlayerInfo = (name: string, includeTimestamps = true) => getPlayers().then(players => {
//     if (!players) return null

//     const player: DBPlayer = players.find(p => p.name.toLowerCase() == name.toLowerCase())
//     if (!player) return null

//     const playerInfo: PlayerInfo = {
//         name: player.name
//     }

//     if (includeTimestamps) {
//         playerInfo.lastOnline = {
//             aurora: unixFromDate(player.lastOnline.aurora)
//         }
//     }
    
//     return playerInfo
// })

export async function getPlayer(name: string) {
    const players = await getPlayers()
    if (!players) throw new Error('Players array could not be found!?')

    const player: DBPlayer = players.find(p => p.name.toLowerCase() == name.toLowerCase())
    if (!player) return null

    return player
}

const getPlayers = async (skipCache = false): Promise<DBPlayer[]> => {
    const skip = !skipCache ? cache.get('players') : null
    if (skip) return skip

    return skip ?? db.collection("players").get().then(async snapshot => { 
        return snapshot.docs.flatMap(doc => doc.data().playerArray)
    }).catch(() => null)
}

// FIRESTORE LIMITS:
// - 500 writes (set, update, delete)
// - 10MB per transaction
async function setPlayers(players: DBPlayer[]) {
    cache.set('players', players, { ttl: 298 * 1000 }) // TODO: ttl could be Infinity since we calling this on interval anyway.

    const dividedPlayerArray = divideArray(players, 8)

    const batch1 = db.batch()
    const batch2 = db.batch()

    let counter = 0
    for (const array of dividedPlayerArray) {      
        counter++

        const playerRef = db.collection("players").doc(`playerArray${counter}`)  
        if (counter > 4) {
            batch2.set(playerRef, { playerArray: array })
        } else {
            batch1.set(playerRef, { playerArray: array })
        }
    }

    // TODO: Check if Promise.all would keep document order 1-8. My guess is no bc why tf would it.
    //await Promise.all([batch1.commit(), batch2.commit()])

    await batch1.commit()
    await batch2.commit()
}

export {
    getPlayers, setPlayers, 
    Aurora, Nova
}