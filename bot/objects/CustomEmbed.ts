import * as fn from '../utils/fn.js'

import type { 
    Client, ColorResolvable, 
    Message, CommandInteraction,
    ModalSubmitInteraction,
    AttachmentBuilder,
    Attachment,
    BaseMessageOptions
} from "discord.js"

import { 
    EmbedBuilder, 
    Colors,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle
} from "discord.js"

const EntityType = {
    Town: "town",
    Nation: "nation",
    Alliance: "alliance",
    Online: "online"
} as const

type ObjectValues<T> = T[keyof T]
type EntityType = ObjectValues<typeof EntityType>

// type BasePayload = {
//     embeds: EmbedBuilder[],
//     components: BaseMessageOptions['components'],
//     files: BaseMessageOptions['files']
// }

export default class CustomEmbed extends EmbedBuilder {
    embeds: EmbedBuilder[] = []
    components: any[] = []
    files: any[] = []

    ephemeral = false
    paginated = false
    page = 0

    client: Client = null
    colour: ColorResolvable = null
    row: ActionRowBuilder = null
    title: string = null

    constructor(client: Client, title: string = null) {
        super({ title, footer: fn.devsFooter(client) })
        this.client = client
        this.title = title
    }

    addField(name: string, value: string, inline = false) {
        this.addFields({ name, value, inline })
        return this
    }

    addButton(id: string, label: string, style = ButtonStyle.Primary) {
        const row = this.row ?? new ActionRowBuilder()
        row.addComponents(new ButtonBuilder()
            .setCustomId(id)
            .setLabel(label)
            .setStyle(style)
        )

        this.row = row
        this.components.push(row)

        return this
    }

    setType(type: EntityType) {
        if (this.colour) return
 
        switch(type) {
            case EntityType.Nation:
                this.colour = Colors.Aqua
                break
            case EntityType.Town:
                this.colour = Colors.Green
                break
            case EntityType.Alliance:
                this.colour = Colors.DarkBlue
                break
        }

        return this
    }

    setColour(value: ColorResolvable) {
        this.colour = value
        return this
    }

    setPage(pageNum: number) {
        this.page = pageNum < 0 ? 0 : pageNum
        return this
    }

    /** Sets the footer to the default one displaying name of the maintainer and bot profile pic as the icon. */
    setDefaultFooter() {
        this.setFooter(fn.devsFooter(this.client))
        return this
    }

    /** Sets the author to the default one where it uses the message author's username and avatar url. */
    setDefaultAuthor(message: Message) {
        this.setAuthor({ 
            name: message.author.username, 
            iconURL: message.author.displayAvatarURL() 
        })

        return this
    }

    setFiles(files: AttachmentBuilder[] | Attachment[]) {
        this.files = files
        return this
    }

    setEphemeral(value: boolean) {
        this.ephemeral = value
    }

    /**
     * Indicates that the data should be paginated, AKA split across multiple embeds.\
     * This allows the user to switch back and forth between "pages" using buttons that are automatically added.
     * @param data The data/list to paginate (will be displayed in 3 backticks).
     * @param dataPrefix The content before the data, like a description.
     * @param dataPostfix The content after the data, like a footer.
     */
    paginate(data: any[], dataPrefix = "", dataPostfix = "") {
        const embeds = []
        const len = data.length

        for (let i = 0; i < len; i++) {
            embeds[i] = new EmbedBuilder()
                .setColor(this.colour)
                .setTitle(this.title)
                .setDescription(dataPrefix + data[i] + dataPostfix)
                .setTimestamp()
                .setFooter({ 
                    text: `Page ${i+1}/${len}`, 
                    iconURL: this.client?.user?.avatarURL()
                })
        }

        this.embeds = embeds
        this.paginated = true

        return this
    }

    async modalReply(interaction: ModalSubmitInteraction) {
        return await interaction.reply({ ...this.payload(), ephemeral: this.ephemeral })
    }

    async reply(interaction: CommandInteraction) {
        if (!this.paginated) return await interaction.reply({ ...this.payload(), ephemeral: this.ephemeral })

        return await interaction.reply(this.payload(true))
            .then(() => fn.paginatorInteraction(interaction, this.embeds, this.page))
    }

    async editInteraction(interaction: CommandInteraction) {
        if (!this.paginated) return await interaction.editReply(this.payload())

        return await interaction.editReply(this.payload(true))
            .then(() => fn.paginatorInteraction(interaction, this.embeds, this.page))
    }
    
    async editMessage(msg: Message) {
        if (!this.paginated) return await msg.edit(this.payload())
        
        return await msg.edit(this.payload(true))
            .then(() => fn.paginator(msg.author.id, msg, this.embeds, this.page))
    }

    /**
     * Creates an object that satisfies type {@link BaseMessageOptions} using the properties of this class
     * so that we can call this method when working with both regular messages and interactions.
     * 
     * @param paginated Whether we should split the {@link embeds} into pages or only provide a single embed.
     */
    payload = (paginated = false): BaseMessageOptions => ({
        embeds: paginated ? [this.embeds[this.page]] : [this],
        components: this.components,
        files: this.files
    })
}

export {
    CustomEmbed,
    EntityType
}