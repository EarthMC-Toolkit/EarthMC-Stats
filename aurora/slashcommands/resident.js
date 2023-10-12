const Discord = require("discord.js"),
      fn = require('../../bot/utils/fn'),
      { ResidentHelper } = require('../../common/resident'),
      { SlashCommandBuilder } = require('@discordjs/builders')

module.exports = {
    name: "resident",
    description: "Displays info for a specific resident.",
    /**
     * @param {Discord.Client} client
     * @param {Discord.CommandInteraction} interaction
     */
    run: async (client, interaction) => {
        await interaction.deferReply()

        const name = interaction.options.getString("name", true)
        if (!name) return interaction.editReply({embeds: [
            new Discord.MessageEmbed()
                .setTitle("Invalid Arguments!")
                .setDescription("Usage: `/resident playerName`")
                .setColor("RED")
                .setFooter(fn.devsFooter(client))
                .setTimestamp()
            ], ephemeral: true
        })

        const resHelper = new ResidentHelper(client)
        await resHelper.init(name, true)

        // Townless
        if (!resHelper.apiResident) {
            if (!resHelper.player?.name) return interaction.editReply({embeds: [
                new Discord.MessageEmbed()
                    .setTitle(name + " isn't a registered player name, please try again.")
                    .setColor("RED")
                    .setFooter(fn.devsFooter(client))
                    .setTimestamp()
                ], ephemeral: true
            })
            
            await resHelper.setupTownlessEmbed()
        }
        else { // Belongs to a town
            await resHelper.setupResidentEmbed()
        }

        await interaction.editReply({embeds: [resHelper.embed]})
    }, data: new SlashCommandBuilder()
        .setName("resident")
        .setDescription("Displays info for a specific resident.")
        .addStringOption(option => option.setName("name").setDescription("Enter a name").setRequired(true))
}