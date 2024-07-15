import {
    type Client, 
    type ChatInputCommandInteraction,
    EmbedBuilder, SlashCommandBuilder, Colors
} from "discord.js"

import { ResidentHelper } from '../../common/resident.js'
import { devsFooter } from "../../bot/utils/fn.js"

export default {
    name: "resident",
    description: "Displays info for a specific resident.",
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply()

        const name = interaction.options.getString("name", true)
        if (!name) {
            await interaction.deleteReply()
            return interaction.followUp({embeds: [new EmbedBuilder()
                .setTitle("Invalid Arguments!")
                .setDescription("Usage: `/resident playerName`")
                .setColor(Colors.Red)
                .setFooter(devsFooter(client))
                .setTimestamp()
            ], ephemeral: true })
        }

        const resHelper = new ResidentHelper(client)
        const exists = await resHelper.init(name)

        if (!exists || !resHelper.apiResident) {
            await interaction.deleteReply()
            return interaction.followUp({embeds: [new EmbedBuilder()
                .setTitle(name + " isn't a registered player name, please try again.")
                .setColor(Colors.Red)
                .setFooter(devsFooter(client))
                .setTimestamp()
            ], ephemeral: true })
        }
            
        await interaction.editReply({
            embeds: [resHelper.createEmbed()]
        })
    }, data: new SlashCommandBuilder()
        .setName("resident")
        .setDescription("Displays info for a specific resident.")
        .addStringOption(option => option.setName("name").setDescription("Enter a name").setRequired(true))
}