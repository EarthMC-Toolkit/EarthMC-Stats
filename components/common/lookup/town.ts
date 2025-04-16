import {
    Colors,
    type Client,
    type AttachmentBuilder
} from "discord.js"

import { 
    OfficialAPI, 
    type RawTownV3
} from "earthmc"

import CommandLookup from "./base.js"

export default class TownLookup extends CommandLookup {
    #apiTown: RawTownV3 = null
    get apiNation() { return this.#apiTown }

    constructor(client: Client) {
        super(client)
        this.embed.setColor(Colors.Green)
    }

    async init(input: string) {
        const arg1 = input?.toLowerCase()
        
        try {
            this.#apiTown = await OfficialAPI.V3.towns(arg1).then(arr => arr[0])
        } catch(e: any) {
            console.error(e)
            return false
        }

        
    }

    createEmbed() {
        //this.#setupEmbed()
        return this.embed
    }

    getDownloadAttachment(): AttachmentBuilder {
        throw new Error("Method not implemented.")
    }
}