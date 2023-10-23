import Discord from 'discord.js'
import cache from 'memory-cache'

const ParagraphStyle = Discord.TextInputStyle.Paragraph
const optionals = ['flag', 'discord', 'fill', 'outline', 'full_name']
const optLower = (opts: Discord.CommandInteractionOptionResolver, k: string) => 
    opts.getString(k).toLowerCase()

const fieldVal = (interaction: Discord.ModalSubmitInteraction, name: string) => 
    interaction.fields.getField(name).value

type Alliance = {
    map: string
    name: string
    fullName: string
    nations: any[]
    leaders: any[]
    imageURL: string
    discordInvite: string
    type: string
    colours: {
        fill: string
        outline: string
    }
}

class AllianceModal extends Discord.ModalBuilder {
    rows = []
    required = false
    alliance: Alliance = null

    constructor(id, title, alliance = null) {
        super({ customId: id, title, components: [] })

        this.alliance = alliance
        this.required = !alliance ? true : false
    }

    createRow = (id, label, placeholder = null, style = Discord.TextInputStyle.Short) => {
        if (optionals.includes(id)) this.required = false
        else this.required = true

        const comp = new Discord.TextInputBuilder()
            .setCustomId(id)
            .setLabel(label)
            .setStyle(style)
            .setRequired(this.required)
    
        if (placeholder) {
            const str = (placeholder.length > 100 && id == 'nations') ? 'Too many nations to display here.' : `${placeholder}`
            comp.setPlaceholder(str)
        }

        return new Discord.ActionRowBuilder().addComponents(comp)
    }

    show = (interaction: Discord.CommandInteraction) => {
        console.log(`Showing creation wizard for ${this.alliance.name}`)

        const key = interaction.member.user.id
        cache.put(`${key}_creating`, this)

        this.addComponents(...[this.rows])
        return interaction.showModal(this)
    }

    main = (options: Discord.CommandInteractionOptionResolver) => {
        this.rows = [
            this.createRow('nations', 'List of Nations', this.alliance?.nations, ParagraphStyle),
            this.createRow('leaders', 'Leader(s)', this.alliance?.leaders, ParagraphStyle),
            this.createRow('flag', 'Flag Image Link (Optional)', this.alliance?.imageURL),
            this.createRow('discord', 'Discord Invite Link (Optional)', this.alliance?.discordInvite),
            this.createRow('full_name', 'Full Name (Optional)', this.alliance?.fullName)
        ]

        this.alliance.map = optLower(options, 'map')
        this.alliance.name = optLower(options, 'name')

        return this
    }

    asObject = (interaction: Discord.ModalSubmitInteraction ) => { 
        const obj: any = {
            mapName: this.alliance.map,
            allianceName: this.alliance.name,
            nations: fieldVal(interaction, 'nations').replaceAll(' ', '').split(','),
            leaders: fieldVal(interaction, 'leaders')
        }

        const fullName = fieldVal(interaction, 'full_name'),
              discord = fieldVal(interaction, 'discord'),
              flag = fieldVal(interaction, 'flag')

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