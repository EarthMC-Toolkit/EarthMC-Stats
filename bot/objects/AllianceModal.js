const Discord = require('discord.js'),
      cache = require('memory-cache')

const optionals = ['flag', 'discord', 'fill', 'outline', 'full_name']

class AllianceModal extends Discord.Modal {
    rows = []
    required = false
    alliance = {}

    constructor(id, title, alliance = null) {
        super({ customId: id, title })

        this.alliance = alliance
        this.required = !alliance ? true : false
    }

    createRow = (id, label, placeholder = null, style = 'SHORT') => {
        if (optionals.includes(id)) this.required = false
        else this.required = true

        const comp = new Discord.TextInputComponent()
            .setCustomId(id)
            .setLabel(label)
            .setStyle(style)
            .setRequired(this.required)
    
        if (placeholder) {
            const str = (placeholder.length > 100 && id == 'nations') ? 'Too many nations to display here.' : `${placeholder}`
            comp.setPlaceholder(str)
        }

        return new Discord.MessageActionRow().addComponents(comp)
    }

    /**
    * @param { Discord.CommandInteraction } interaction
    */
    show = interaction => {
        console.log(`Showing creation wizard for ${this.alliance.name}`)

        const key = interaction.member.user.id
        cache.put(`${key}_creating`, this)

        this.addComponents(...[this.rows])
        return interaction.showModal(this)
    }

    /**
    * @param { Discord.CommandInteractionOptionResolver } options
    */
    main = options => {
        this.rows = [
            this.createRow('nations', 'List of Nations', this.alliance?.nations, 'PARAGRAPH'),
            this.createRow('leaders', 'Leader(s)', this.alliance?.leaders, 'PARAGRAPH'),
            this.createRow('flag', 'Flag Image Link (Optional)', this.alliance?.imageURL),
            this.createRow('discord', 'Discord Invite Link (Optional)', this.alliance?.discordInvite),
            this.createRow('full_name', 'Full Name (Optional)', this.alliance?.fullName),
        ]

        const lower = key => options.getString(key).toLowerCase()
        this.alliance = {
            map: lower('map'),
            name: lower('name')
        }

        return this
    }

    /**
    * @param { Discord.ModalSubmitInteraction } interaction
    */
    asObject = interaction => { 
        const fields = interaction.fields
        const value = name => fields.getField(name).value
        
        const obj = {
            mapName: this.alliance.map,
            allianceName: this.alliance.name,
            nations: value('nations').replaceAll(' ', '').split(','),
            leaders: value('leaders')
        }

        const fullName = value('full_name'),
              discord = value('discord'),
              flag = value('flag')

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

module.exports = AllianceModal