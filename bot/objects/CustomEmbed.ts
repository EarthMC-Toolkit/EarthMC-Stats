import * as fn from '../utils/fn.js'

import type { 
    Client, ColorResolvable, 
    Message, CommandInteraction,
    ModalSubmitInteraction,
    AttachmentBuilder,
    Attachment
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

class CustomEmbed extends EmbedBuilder {
    embeds = []
    components = []
    files = []

    paginated = false
    page = 0

    client: Client = null
    colour: ColorResolvable = null
    row: ActionRowBuilder = null
    title: string = null

    constructor(client: Client, title: string = null) {
        super({ title, footer: fn.devsFooter(client) })
        this.client = client
    }

    addField(name: string, value: string, inline = false) {
        this.addFields({ name, value, inline })
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

    setDefaultAuthor(message: Message) {
        this.setAuthor({ 
            name: message.author.username, 
            iconURL: message.author.displayAvatarURL() 
        })

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

    setFiles(files: AttachmentBuilder[] | Attachment[]) {
        this.files = files
        return this
    }

    paginate(data, prefix = "", postfix = "") {
        const embeds = [], 
              len = data.length

        for (let i = 0; i < len; i++) {
            embeds[i] = new EmbedBuilder()
                .setColor(this.colour)
                .setTitle(this.title)
                .setDescription(prefix + data[i] + postfix)
                .setTimestamp()
                .setFooter({ 
                    text: `Page ${i+1}/${len}`, 
                    iconURL: this.client?.user.avatarURL() ?? "" 
                })
        }

        this.embeds = embeds
        this.paginated = true

        return this
    }

    modalReply = async(interaction: ModalSubmitInteraction) => await interaction.reply(this.payload())

    async reply(interaction: CommandInteraction) {
        if (!this.paginated) return await interaction.reply(this.payload())

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

    payload = (paginated = false) => ({
        embeds: paginated ? [this.embeds[this.page]] : [this],
        components: this.components,
        files: this.files
    })
}

export {
    CustomEmbed,
    EntityType
}