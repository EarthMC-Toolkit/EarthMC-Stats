import {
    type Client,
    type ChatInputCommandInteraction,
    Colors, EmbedBuilder
} from "discord.js"

import { MojangLib } from 'earthmc'

import * as database from "../../bot/utils/database.js"
import { devsFooter, embedField } from "../../bot/utils/fn.js"

const status = (data: any) => !data ? "Offline :red_circle:" : "Online :green_circle:"

export default {
    name: "status",
    description: "Displays the current server status.",
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply()

        const embed = new EmbedBuilder()
            .setTitle("EarthMC Status Overview")
            .setColor(Colors.Green)
            .setFooter(devsFooter(client))
            .setTimestamp()

        const serverData = await MojangLib.servers.get("play.earthmc.net")
        const auroraData = await database.Aurora.getTownyData()

        if (serverData && !auroraData)
            embed.setDescription("The server seems to be up, but the map is unavailable!")
        
        embed.addFields(
            embedField("Server", `${status(serverData)}`, true),
            embedField("Aurora Map", `${status(auroraData)}`, true)
        )

        await interaction.editReply({ embeds: [embed] })
    }
}