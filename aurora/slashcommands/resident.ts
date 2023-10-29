import Discord from "discord.js"

import * as fn from '../../bot/utils/fn.js'
import { ResidentHelper } from '../../common/resident.js'

export default {
    name: "resident",
    description: "Displays info for a specific resident.",
    run: async (client: Discord.Client, interaction: Discord.ChatInputCommandInteraction) => {
        await interaction.deferReply()

        const name = interaction.options.getString("name", true)
        if (!name) {
            await interaction.deleteReply()
            return interaction.followUp({embeds: [
                new Discord.EmbedBuilder()
                    .setTitle("Invalid Arguments!")
                    .setDescription("Usage: `/resident playerName`")
                    .setColor(Discord.Colors.Red)
                    .setFooter(fn.devsFooter(client))
                    .setTimestamp()
                ], ephemeral: true
            })
        }

        const resHelper = new ResidentHelper(client)
        await resHelper.init(name, true)

        if (!resHelper.apiResident) {
            await interaction.deleteReply()
            return interaction.followUp({embeds: [new Discord.EmbedBuilder()
                .setTitle(name + " isn't a registered player name, please try again.")
                .setColor(Discord.Colors.Red)
                .setFooter(fn.devsFooter(client))
                .setTimestamp()
            ], ephemeral: true})
        }
            
        await resHelper.setupEmbed()
        await interaction.editReply({ embeds: [resHelper.embed] })
    }, data: new Discord.SlashCommandBuilder()
        .setName("resident")
        .setDescription("Displays info for a specific resident.")
        .addStringOption(option => option.setName("name").setDescription("Enter a name").setRequired(true))
}