import { cache } from '../constants.js'

import { unixFromDate, divideArray } from "./fn.js"

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

const getPlayers = async (skipCache = false): Promise<DBPlayer[]> => {
    const skip = !skipCache ? cache.get('players') : null
    if (skip) return skip

    return skip ?? db.collection("players").get().then(async snapshot => { 
        return snapshot.docs.flatMap(doc => doc.data().playerArray)
    }).catch(() => null)
}

const getPlayerInfo = (name: string, includeTimestamps = true) => getPlayers().then(players => {
    if (!players) return null

    const player: any = players.find(p => p.name.toLowerCase() == name.toLowerCase())
    if (!player) return null

    player["discord"] = player.linkedID

    if (includeTimestamps) {
        player.lastOnline = {
            nova: unixFromDate(player.lastOnline.nova),
            aurora: unixFromDate(player.lastOnline.aurora)
        }
    }
    
    return player
})

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

    // TODO: Check if Promise.all would keep document order 1-8.
    //await Promise.all([batch1.commit(), batch2.commit()])

    await batch1.commit()
    await batch2.commit()
}

export {
    getPlayerInfo, 
    getPlayers, setPlayers, 
    Aurora, Nova
}