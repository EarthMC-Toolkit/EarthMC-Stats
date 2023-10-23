import { BaseHelper } from "./base.js"

import type { Client } from "discord.js"
import { Colors } from "discord.js"

class NationHelper extends BaseHelper {
    constructor(client: Client, isNova = false) {
        super(client, isNova)
        this.embed.setColor(Colors.Orange)
    }
}

export {
    NationHelper
}