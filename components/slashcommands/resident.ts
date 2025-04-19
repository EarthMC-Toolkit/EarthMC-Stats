import {
    EmbedBuilder, SlashCommandBuilder, Colors
} from "discord.js"

import ResidentLookup from '../common/lookup/resident.js'
import { devsFooter } from "../../bot/utils/index.js"

import type { SlashCommand } from "../../bot/types.js"

const slashCmdData = new SlashCommandBuilder()
    .setName("resident")
    .setDescription("Displays info for a specific resident.")
    .addStringOption(option => option.setName("name")
        .setDescription("Enter a name")
        .setRequired(true)
    )

const residentCmd: SlashCommand<typeof slashCmdData> = {
    name: "resident",
    description: "Displays info for a specific resident.",
    data: slashCmdData,
    run: async (client, interaction) => {
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

        const resLookup = new ResidentLookup(client)
        const exists = await resLookup.init(name)

        if (!exists || !resLookup.apiResident) {
            await interaction.deleteReply()
            return interaction.followUp({embeds: [new EmbedBuilder()
                .setTitle(`${name} isn't a registered player name, please try again.`)
                .setColor(Colors.Red)
                .setFooter(devsFooter(client))
                .setTimestamp()
            ], ephemeral: true })
        }
            
        await interaction.editReply({
            embeds: [resLookup.createEmbed()]
        })
    }
}

export default residentCmd