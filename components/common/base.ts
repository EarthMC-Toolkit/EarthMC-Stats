import * as fn from '../../bot/utils/fn.js'

import { 
    type Client,
    type AttachmentBuilder,
    EmbedBuilder
} from 'discord.js'

export default abstract class BaseCommandHelper {
    client: Client = null
    embed = new EmbedBuilder()

    constructor(client: Client) {
        this.client = client
        this.embed.setFooter(fn.devsFooter(client)).setTimestamp()
    }

    abstract init(input: string): Promise<boolean>;
    abstract createEmbed(): EmbedBuilder;
    abstract getDownloadAttachment(): AttachmentBuilder

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
     * Stringifys the embed data, returning info about this command as a JSON string.\
     * While we could use `embed.toJSON()`, this avoids the overhead of validation and allows us to customize how it gets printed.
     * @param pretty Whether to format the returned JSON string with line breaks and 2 indents.
     */
    raw = (pretty = true) => {
        const embedData = this.embed.data
        return pretty ? JSON.stringify(embedData, null, 2) : JSON.stringify(embedData)
    }
}

export {
    BaseCommandHelper
}