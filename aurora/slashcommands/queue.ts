import {
    type Client, 
    type ChatInputCommandInteraction,
    Colors, EmbedBuilder
} from "discord.js"

import { MojangLib } from 'earthmc'

import * as database from "../../bot/utils/database.js"

import Queue from "../../bot/objects/Queue.js"
import { embedField } from "../../bot/utils/fn.js"

export default {
    name: "queue",
    description: "Get the current server queue.",
    run: async (_: Client, interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply()

        const server = await MojangLib.servers.get("play.earthmc.net").catch(() => {})

        const aurora = await database.Aurora.getOnlinePlayerData()
        //const nova = await database.Nova.getOnlinePlayerData().catch(() => {})

        const queue = new Queue(server, aurora)
        await queue.init()

        const totalMax = queue.aurora.max
        const embed = new EmbedBuilder()
            .setTitle("Queue & Player Info")
            .setColor(Colors.Green)
            .addFields(
                embedField("Players In Queue", queue.get()),
                embedField("Total", `${queue.totalPlayers}/${totalMax}`),
                embedField("Aurora", queue.aurora.formatted, true)
            )

        await interaction.editReply({ embeds: [embed] })
    }
}