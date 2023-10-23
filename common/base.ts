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
}

export {
    BaseHelper
}