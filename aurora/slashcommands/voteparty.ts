import {
    type Client,
    type ChatInputCommandInteraction,
    Colors, EmbedBuilder
} from "discord.js"

import { devsFooter } from "../../bot/utils/fn.js"
import { VPHelper } from "../../common/voteparty.js"

export default {
    name: "voteparty",
    description: "Displays VoteParty info and its current status.",
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply()

        const vpHelper = new VPHelper(client)
        const ok = await vpHelper.init()

        if (!ok) {
            await interaction.deleteReply()
            return interaction.followUp({embeds: [new EmbedBuilder()
                .setTitle("Something went wrong fetching vote information! The Official API may currently be down.")
                .setColor(Colors.Red)
                .setFooter(devsFooter(client))
                .setTimestamp()
            ], ephemeral: true })
        }
            
        await vpHelper.setupEmbed()
        await interaction.editReply({ embeds: [vpHelper.embed] })
    }
}