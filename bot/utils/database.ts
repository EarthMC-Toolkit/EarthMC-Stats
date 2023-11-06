import * as fn from "./fn.js"
import cache from 'memory-cache'

import type { 
    DocumentReference, 
    DocumentSnapshot, 
    DocumentData 
} from "firebase-admin/firestore"

import { getFirestore } from "firebase-admin/firestore"

const db = () => getFirestore()
const playerCollection = () => db().collection("players")

export type DocSnapshot = DocumentSnapshot<DocumentData>
export type DocReference = DocumentReference

const getPlayers = async (skipCache=false) => {
    const skip = !skipCache ? cache.get('players') : null

    return skip ?? playerCollection().get().then(async snapshot => { 
        return snapshot.docs.flatMap(doc => doc.data().playerArray)
    }).catch(() => {})
}

const getPlayerInfo = (name: string, includeTimestamps=true) => getPlayers().then(players => {
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
        playerCollection().doc("playerArray" + counter).set({ playerArray: array })
    }
}

import * as Nova from "./nova.js"
import * as Aurora from "./aurora.js"

export {
    getPlayerInfo, 
    getPlayers, setPlayers, 
    Aurora, Nova
}