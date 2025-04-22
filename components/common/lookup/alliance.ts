import type { AttachmentBuilder, Client } from "discord.js"
import { Colors } from "discord.js"

import CommandLookup from "./base.js"

export default class AllianceLookup extends CommandLookup {
    nameInput: string

    constructor(client: Client) {
        super(client)
        this.embed.setColor(Colors.DarkBlue)
    }

    async init(input: string) {
        this.nameInput = input
        
        return false
    }

    createEmbed() {
        //this.#setupEmbed()
        return this.embed
    }

    getDownloadAttachment(): AttachmentBuilder {
        throw new Error("Method not implemented.")
    }
}