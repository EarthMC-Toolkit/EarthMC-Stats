import {
    type CommandInteractionOptionResolver,
    type ModalSubmitInteraction,
    type ChatInputCommandInteraction,
    ModalBuilder, ActionRowBuilder,
    TextInputBuilder, TextInputStyle
} from 'discord.js'

import { cache } from '../constants.js'

const ParagraphStyle = TextInputStyle.Paragraph
const optionals = ['flag', 'discord', 'fill', 'outline', 'full_name']
const optLower = (opts: CommandInteractionOptionResolver, k: string) => 
    opts.getString(k).toLowerCase()

const fieldVal = (interaction: ModalSubmitInteraction, name: string) => 
    interaction.fields.getField(name).value

type Alliance = {
    map: string
    name: string
    fullName: string
    nations: string[]
    leaders: string[]
    imageURL: string
    discordInvite: string
    type: string
    colours: {
        fill: string
        outline: string
    }
}

class AllianceModal extends ModalBuilder {
    rows = []
    required = false
    alliance: Alliance = null

    constructor(id: string, title: string, alliance = null) {
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
        console.log(`Showing creation wizard for ${this.alliance.name}`)

        const key = interaction.member.user.id
        cache.set(`${key}_creating`, this)

        this.addComponents(...[this.rows])
        return interaction.showModal(this)
    }

    main = (options: CommandInteractionOptionResolver) => {
        this.rows = [
            this.createRow('nations', 'List of Nations', this.alliance?.nations.join(", "), ParagraphStyle),
            this.createRow('leaders', 'Leader(s)', this.alliance?.leaders.join(", "), ParagraphStyle),
            this.createRow('flag', 'Flag Image Link (Optional)', this.alliance?.imageURL),
            this.createRow('discord', 'Discord Invite Link (Optional)', this.alliance?.discordInvite),
            this.createRow('full_name', 'Full Name (Optional)', this.alliance?.fullName)
        ]

        this.alliance.map = optLower(options, 'map')
        this.alliance.name = optLower(options, 'name')

        return this
    }

    asObject = (interaction: ModalSubmitInteraction ) => { 
        const obj: any = {
            mapName: this.alliance.map,
            allianceName: this.alliance.name,
            nations: fieldVal(interaction, 'nations').replaceAll(' ', '').split(','),
            leaders: fieldVal(interaction, 'leaders')
        }

        const fullName = fieldVal(interaction, 'full_name')
        const discord = fieldVal(interaction, 'discord')
        const flag = fieldVal(interaction, 'flag')

        if (fullName) obj.fullName = fullName
        if (discord) obj.discord = discord
        if (flag) obj.imageURL = flag

        return obj
    }

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