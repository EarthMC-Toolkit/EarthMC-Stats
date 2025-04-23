import {
    type Client,
    type ChatInputCommandInteraction,
    Colors, EmbedBuilder,
    SlashCommandBuilder
} from "discord.js"

import { AURORA, devsFooter } from "../../bot/utils/index.js"
import type { SlashCommand } from "../../bot/types.js"

import { VPLookup } from "../common/lookup/voteparty.js"

const desc = "Displays VoteParty info and its current status."
const slashCmdData = new SlashCommandBuilder()
    .setName("voteparty")
    .setDescription(desc)

const votePartyCmd: SlashCommand<typeof slashCmdData> = {
    name: "voteparty",
    description: desc,
    data: slashCmdData,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply()

        const vpLookup = new VPLookup(client)
        const ok = await vpLookup.init()

        if (!ok) {
            await interaction.deleteReply()
            return interaction.followUp({embeds: [new EmbedBuilder()
                .setTitle("Something went wrong fetching vote information! The Official API may currently be down.")
                .setColor(Colors.Red)
                .setFooter(devsFooter(client))
                .setTimestamp()
            ], ephemeral: true })
        }
        
        await interaction.editReply({
            embeds: [vpLookup.createEmbed()], 
            files: [AURORA.thumbnail]
        })
    }
}

export default votePartyCmd