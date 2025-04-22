import {
    type Client,
    type AttachmentBuilder,
    EmbedBuilder
} from 'discord.js'

import { devsFooter } from '../../../bot/utils/index.js'

export default abstract class CommandLookup {
    client: Client = null
    embed = new EmbedBuilder()

    constructor(client: Client) {
        this.client = client
        this.embed.setFooter(devsFooter(client)).setTimestamp()
    }

    /**
     * Initializes this lookup object with relevant data.
     * @param input The name of the thing we want to lookup.
     */
    abstract init(input: string): Promise<boolean>;

    /**
     * Creates an embed using data we initialized and acquired from other methods in this class.\
     * This result of this method can be passed to the `embeds` Discord message option when sending it to the user.
     */
    abstract createEmbed(): EmbedBuilder;

    /**
     * Creates a buffer from the raw embed data and returns it as an attachment.\
     * The result of this method can be passed to the `files` Discord message option to attach it as a JSON file.
     */
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