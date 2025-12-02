import { Aurora } from "earthmc"

import { TTLCache } from '@isaacs/ttlcache'
import type { Firestore } from "firebase-admin/firestore"

import type { ExtendedClient, MapInstance, SeenPlayer } from "./types.js"

import { database } from "./utils/index.js"

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

export let db: Firestore = null
export const setDatabase = (instance: Firestore) => {
    db = instance
}

export const AURORA: MapInstance = { 
    emc: Aurora,
    db: database.AuroraDB
}

// We update this every x seconds, so expiry isn't needed.
export const cache = new TTLCache<string, any>({ ttl: Infinity })

// Key is the player name
export const lastSeenPlayers = new Map<string, SeenPlayer>()