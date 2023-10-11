const Discord = require("discord.js"),
      Colours = Discord.Constants.Colors,
      fn = require("../utils/fn")

const Type = {
    Town: "town",
    Nation: "nation",
    Alliance: "alliance",
    Online: "online"
}

class CustomEmbed extends Discord.MessageEmbed {
    embeds = []
    components = []
    paginated = false
    page = 0

    client = null
    colour = null
    row = null
    title = null

    /**
     * @param { Discord.Client } client 
     * @param { string } title 
     */
    constructor(client, title) {
        super()
        
        this.client = client
        this.title = title

        this.setFooter(fn.devsFooter(client))
    }

    addField(name, value, inline) {
        this.fields.push({ name, value, inline })
        return this
    }

    setType(type) {
        if (this.color) return
 
        if (type == Type.Nation) this.colour = Colours.AQUA
        else if (type == Type.Town) this.colour = Colours.GREEN

        return this
    }

    /**
     * @param { number } pageNum 
     */
    setPage(pageNum) {
        if (pageNum < 0) this.page = 0
        else this.page = pageNum

        return this
    }

    /**
     * @param { Discord.Message } message 
     */
    setDefaultAuthor(message) {
        this.setAuthor({ 
            name: message.author.username, 
            iconURL: message.author.displayAvatarURL() 
        })

        return this
    }

    /**
     * @param { string } id 
     * @param { string } label 
     * @param { Discord.MessageButtonStyleResolvable} style 
     */
    addButton(id, label, style = "PRIMARY") {
        const row = this.row ?? new Discord.MessageActionRow()
        row.addComponents(new Discord.MessageButton()
            .setCustomId(id)
            .setLabel(label)
            .setStyle(style))

        this.row = row
        this.components.push(row)

        return this
    }

    paginate(data, prefix = "", postfix = "") {
        const embeds = [], 
              len = data.length

        for (let i = 0; i < len; i++) {
            embeds[i] = new Discord.MessageEmbed()
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

    async editInteraction(interaction) {
        if (!this.paginated) return await interaction.editReply({embeds: [this], components: this.components })

        return await interaction.editReply({embeds: [this.embeds[this.page]], components: this.components })
            .then(() => fn.paginatorInteraction(interaction, this.embeds, this.page))
    }
    
    async editMessage(msg) {
        if (!this.paginated) return await msg.edit({embeds: [this], components: this.components })
        
        return await msg.edit({embeds: [this.embeds[this.page]], components: this.components })
            .then(() => fn.paginator(msg.author.id, msg, this.embeds, this.page))
    }
}

module.exports = {
    CustomEmbed,
    Type
}