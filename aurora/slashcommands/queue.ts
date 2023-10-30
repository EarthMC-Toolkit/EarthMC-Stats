import {
    type Client, 
    type ChatInputCommandInteraction,
    Colors, EmbedBuilder
} from "discord.js"

import { MojangLib } from 'earthmc'

import * as fn from "../../bot/utils/fn.js"
import * as database from "../../bot/utils/database.js"

import Queue from "../../bot/objects/Queue.js"

export default {
    name: "queue",
    description: "Get the current server queue.",
    run: async (_: Client, interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply()

        const aurora = await database.Aurora.getOnlinePlayerData().catch(() => {}),
              nova = await database.Nova.getOnlinePlayerData().catch(() => {}),
              server = await MojangLib.servers.get("play.earthmc.net").catch(() => {})

        const queue = new Queue(server, aurora, nova)
        await queue.init()

        const totalMax = (queue.nova.config?.maxcount ?? 200) + (queue.aurora.config?.maxcount ?? 200)
        const embed = new EmbedBuilder()
            .setTitle("Queue & Player Info")
            .setColor(Colors.Green)
            .addFields(
                fn.embedField("Players In Queue", queue.get()),
                fn.embedField("Total", `${queue.totalPlayers}/${totalMax}`),
                fn.embedField("Aurora", queue.aurora.formatted, true),
                fn.embedField("Nova", queue.nova.formatted, true),
            )

        await interaction.editReply({embeds: [embed]})
    }
}