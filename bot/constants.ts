import { Client } from "discord.js"
import * as emc from "earthmc"
import * as database from "../bot/utils/database.js"
import { Firestore } from "firebase-admin/firestore"

let prod: boolean
const setProduction = (val: boolean) => prod = val

let client: Client = null
const setClient = (val: Client) => client = val

let db: Firestore = null
const setDatabase = (val: Firestore) => db = val

const queueSubbedChannels = db.collection("subs").doc("queue")
const townlessSubbedChannels = db.collection("subs").doc("townless")

const NOVA = { 
    emc: emc.Nova, 
    db: database.Nova 
}

const AURORA = { 
    emc: emc.Aurora, 
    db: database.Aurora 
}

export {
    prod, setProduction,
    client, setClient, 
    db, setDatabase,
    townlessSubbedChannels,
    queueSubbedChannels,
    NOVA, AURORA
}