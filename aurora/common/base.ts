import * as fn from '../../bot/utils/fn.js'

import { 
    type Client,
    EmbedBuilder
} from 'discord.js'

export default class BaseCommandHelper {
    embed = new EmbedBuilder()

    constructor(client: Client) {
        this.embed.setFooter(fn.devsFooter(client)).setTimestamp()
        //this.isNova = isNova
    }

    /**
     * Appends a single field to the embed (max 25 fields).\
     * This is equivalent to calling `embed.addFields` once, essentially bringing back the old chain style.
     * @param name The field title.
     * @param value The field description/text.
     * @param inline Whether this field should be displayed on the same line (up to max of 3).
     */
    addField(name: string, value: string, inline = false) {
        this.embed.addFields({ name, value, inline })
        return this
    }

    /**
     * Get the raw data of this command by stringifying the whole embed object.
     * @returns {string} The JSON formatted string.
     */
    raw = () => JSON.stringify(this.embed)
}

export {
    BaseCommandHelper
}