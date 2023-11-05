import { Client } from "discord.js"
import * as emc from "earthmc"
import * as database from "../bot/utils/database.js"
import { Firestore } from "firebase-admin/firestore"
import { DocReference } from "../bot/utils/database.js"

let prod: boolean = false
const setProduction = (val: boolean) => prod = val

let client: Client = null
const setClient = (val: Client) => client = val

let db: Firestore = null
let queueSubbedChannels: DocReference = null
let townlessSubbedChannels: DocReference = null

const setDatabase = (val: Firestore) => {
    db = val

    const subsCollection = db.collection("subs")
    queueSubbedChannels = subsCollection.doc("queue")
    townlessSubbedChannels = subsCollection.doc("townless")
}

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