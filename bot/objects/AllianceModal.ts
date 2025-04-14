import {
    type CommandInteractionOptionResolver,
    type ChatInputCommandInteraction,
    ModalBuilder, ActionRowBuilder,
    TextInputBuilder, TextInputStyle
} from 'discord.js'

import { cache } from '../constants.js'
import type { DBAlliance } from '../types.js'

const ParagraphStyle = TextInputStyle.Paragraph
const optionals = ['flag', 'discord', 'fill', 'outline', 'full_name']
const optLower = (opts: CommandInteractionOptionResolver, k: string) => 
    opts.getString(k).toLowerCase()

// function fieldVal(interaction: ModalSubmitInteraction, name: string) {
//     return interaction.fields.getField(name).value
// }

class AllianceModal extends ModalBuilder {
    rows: ActionRowBuilder<any>[] = []
    required = false
    alliance: DBAlliance & { map?: string } = null

    constructor(id: string, title: string, alliance: DBAlliance = null) {
        super({ customId: id, title, components: [] })

        this.alliance = alliance
        this.required = !alliance ? true : false
    }

    createRow = (id: string, label: string, placeholder: string = null, style = TextInputStyle.Short) => {
        this.required = !optionals.includes(id)

        const comp = new TextInputBuilder()
            .setCustomId(id)
            .setLabel(label)
            .setStyle(style)
            .setRequired(this.required)
    
        if (placeholder) {
            const str = (placeholder.length > 100 && id == 'nations') ? 'Too many nations to display here.' : `${placeholder}`
            comp.setPlaceholder(str)
        }

        return new ActionRowBuilder().addComponents(comp)
    }

    show = (interaction: ChatInputCommandInteraction) => {
        console.log(`Showing creation wizard for ${this.alliance.allianceName}`)

        const key = interaction.member.user.id
        cache.set(`${key}_creating`, this)

        this.addComponents(...[this.rows])
        return interaction.showModal(this)
    }

    main = (options: CommandInteractionOptionResolver) => {
        this.rows = [
            this.createRow('nations', 'List of Nations', this.alliance?.nations.join(", "), ParagraphStyle),
            this.createRow('leaders', 'Leader(s)', this.alliance?.leaderName, ParagraphStyle),
            this.createRow('flag', 'Flag Image Link (Optional)', this.alliance?.imageURL),
            this.createRow('discord', 'Discord Invite Link (Optional)', this.alliance?.discordInvite),
            this.createRow('full_name', 'Full Name (Optional)', this.alliance?.fullName)
        ]

        this.alliance.map = optLower(options, 'map')

        return this
    }

    // Only call when creating.
    // asObject = (modal: ModalSubmitInteraction) => { 
    //     const obj: DBAlliance & { map?: string } = {
    //         map: this.alliance.map,
    //         allianceName: this.alliance.allianceName,
    //         type: this.alliance.type || "normal",
    //         nations: fieldVal(modal, 'nations').replaceAll(' ', '').split(','),
    //         leaderName: fieldVal(modal, 'leaders'),
    //         //lastUpdated: this.alliance.lastUpdated
    //     }

    //     const fullName = fieldVal(modal, 'full_name')
    //     const discord = fieldVal(modal, 'discord')
    //     const flag = fieldVal(modal, 'flag')

    //     if (fullName) obj.fullName = fullName
    //     if (discord) obj.discordInvite = discord
    //     if (flag) obj.imageURL = flag

    //     return obj
    // }

    extra = () => {
        this.rows = [
            this.createRow('type', 'Type (Sub/Mega/Pact)', this.alliance?.type),
            this.createRow('fill', 'Fill Colour (Optional)', this.alliance?.colours.fill),
            this.createRow('outline', 'Outline Colour (Optional)', this.alliance?.colours.outline)
        ]

        return this
    }
}

export default AllianceModal