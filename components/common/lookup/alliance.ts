import type { AttachmentBuilder, Client } from "discord.js"
import { Colors } from "discord.js"

import CommandLookup from "./base.js"

class AllianceHelper extends CommandLookup {
    constructor(client: Client) {
        super(client)
        this.embed.setColor(Colors.DarkBlue)
    }

    async init(_input: string) {
        return false
    }

    createEmbed() {
        //this.#setupEmbed()
        return this.embed
    }

    getDownloadAttachment (): AttachmentBuilder {
        throw new Error("Method not implemented.")
    }
}

export {
    AllianceHelper
}