import { cache } from '../constants.js'

import { unixFromDate, divideArray } from "./fn.js"
import * as Nova from "./nova.js"
import * as Aurora from "./aurora.js"

import { db } from "../constants.js"
import type { 
    DocumentReference, 
    DocumentSnapshot, 
    DocumentData 
} from "firebase-admin/firestore"

import type { DBPlayer } from '../types.js'

export type DocSnapshot = DocumentSnapshot<DocumentData>
export type DocReference = DocumentReference

const getPlayers = async (skipCache = false) => {
    const skip = !skipCache ? cache.get('players') : null
    if (skip) return skip

    return skip ?? db.collection("players").get().then(async snapshot => { 
        return snapshot.docs.flatMap(doc => doc.data().playerArray)
    }).catch(() => null)
}

const getPlayerInfo = (name: string, includeTimestamps = true) => getPlayers().then(players => {
    if (!players) return null

    const player = players.find(p => p.name.toLowerCase() == name.toLowerCase())
    if (!player) return null

    player["discord"] = player.linkedID

    if (includeTimestamps) {
        player["lastOnline"] = {
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
    
    for (const array of dividedPlayerArray) {      
        counter++

        db.collection("players")
            .doc(`playerArray${counter}`)
            .set({ playerArray: array })
    }
}

export {
    getPlayerInfo, 
    getPlayers, setPlayers, 
    Aurora, Nova
}