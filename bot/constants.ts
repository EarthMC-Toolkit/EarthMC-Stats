import { Aurora } from "earthmc"

import type { Firestore } from "firebase-admin/firestore"
import type { ExtendedClient, MapInstance, SeenPlayer } from "./types.js"

import { 
    type DocReference, 
    Aurora as AuroraDB
} from "./utils/database.js"

import TTLCache from '@isaacs/ttlcache'

const state: { prod: boolean, client: ExtendedClient } = {
    prod: false,
    client: null
}

export const getProduction = () => state.prod
export function setProduction(val: boolean) { 
    state.prod = val 
}

export const getClient = () => state.client
export function setClient(val: ExtendedClient) {
    state.client = val
}

let db: Firestore = null
let queueSubbedChannels: DocReference = null
let townlessSubbedChannels: DocReference = null

const setDatabase = (instance: Firestore) => {
    db = instance

    const subsCollection = db.collection("subs")
    queueSubbedChannels = subsCollection.doc("queue")
    townlessSubbedChannels = subsCollection.doc("townless")
}

const AURORA: MapInstance = { 
    emc: Aurora,
    db: AuroraDB
}

// We update this every x seconds, so expiry isn't needed.
const cache = new TTLCache<string, any>({ ttl: Infinity })

export const lastSeenPlayers = new Map<string, SeenPlayer>()

export {
    cache, db, setDatabase,
    townlessSubbedChannels,
    queueSubbedChannels,
    AURORA
}