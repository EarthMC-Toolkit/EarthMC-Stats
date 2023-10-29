import * as fn from '../utils/fn.js'

import type { Client, ColorResolvable, Message } from "discord.js"
import { 
    EmbedBuilder, 
    Colors,
    CommandInteraction,
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
    paginated = false
    page = 0

    client: Client = null
    colour: ColorResolvable = null
    row: ActionRowBuilder = null
    title: string = null

    constructor(client: Client, title: string) {
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

    async reply(interaction: CommandInteraction) {
        if (!this.paginated) return await interaction.reply({embeds: [this], components: this.components })

        return await interaction.reply({ 
            embeds: [this.embeds[this.page]], 
            components: this.components 
        }).then(() => fn.paginatorInteraction(interaction, this.embeds, this.page))
    }

    async editInteraction(interaction: CommandInteraction) {
        if (!this.paginated) return await interaction.editReply({embeds: [this], components: this.components })

        return await interaction.editReply({ 
            embeds: [this.embeds[this.page]], 
            components: this.components 
        }).then(() => fn.paginatorInteraction(interaction, this.embeds, this.page))
    }
    
    async editMessage(msg: Message) {
        if (!this.paginated) return await msg.edit({embeds: [this], components: this.components })
        
        return await msg.edit({ 
            embeds: [this.embeds[this.page]], 
            components: this.components 
        }).then(() => fn.paginator(msg.author.id, msg, this.embeds, this.page))
    }
}

export {
    CustomEmbed,
    EntityType
}