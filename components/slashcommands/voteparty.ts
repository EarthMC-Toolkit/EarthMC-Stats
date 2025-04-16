import {
    type Client,
    type ChatInputCommandInteraction,
    Colors, EmbedBuilder
} from "discord.js"

import { AURORA, devsFooter } from "../../bot/utils/index.js"
import { VPLookup } from "../common/lookup/voteparty.js"

export default {
    name: "voteparty",
    description: "Displays VoteParty info and its current status.",
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