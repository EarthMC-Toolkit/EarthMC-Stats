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

async function setPlayers(players: DBPlayer[]) {
    cache.set('players', players, { ttl: 298 * 1000 })

    let counter = 0
    const dividedPlayerArray = divideArray(players, 8)

    //const batch = db.batch()
    
    for (const array of dividedPlayerArray) {      
        counter++

        const playerRef = db.collection("players").doc(`playerArray${counter}`)

        // Sort each arr by latest timestamp first so DB is easier to manually navigate.
        array.sort((b, a) => {
            if (!b.lastOnline?.aurora?.seconds || !a.lastOnline?.aurora?.seconds) return 0
            return b.lastOnline.aurora.seconds - a.lastOnline.aurora.seconds
        })

        playerRef.set({ playerArray: array })
        //batch.set(playerRef, { playerArray: array })
    }

    //await batch.commit()
}

export {
    getPlayerInfo, 
    getPlayers, setPlayers, 
    Aurora, Nova
}