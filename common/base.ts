import * as fn from '../bot/utils/fn.js'

import { EmbedBuilder } from 'discord.js'
import type { Client } from 'discord.js'

class BaseHelper {
    client = null
    isNova = false

    embed = new EmbedBuilder()

    constructor(client: Client, isNova: boolean) {
        this.embed.setFooter(fn.devsFooter(client)).setTimestamp()
        this.isNova = isNova
    }

    addField(name: string, value: string, inline = false) {
        this.embed.addFields({ name, value, inline })
        return this.embed
    }
}

export {
    BaseHelper
}