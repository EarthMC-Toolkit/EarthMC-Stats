import { BaseCommandHelper } from "./base.js"

import type { Client } from "discord.js"
import { Colors } from "discord.js"

class TownHelper extends BaseCommandHelper {
    constructor(client: Client) {
        super(client)
        this.embed.setColor(Colors.Green)
    }

    async init(_input: string) {
        return false
    }

    setupEmbed() {
        
    }
}

export {
    TownHelper
}