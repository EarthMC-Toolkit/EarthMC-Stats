import { MojangLib } from 'earthmc'

import {
    type Client,
    type ChatInputCommandInteraction,
    EmbedBuilder, SlashCommandBuilder,
    Colors
} from "discord.js"

import {
    database,
    devsFooter,
    embedField
} from "../../bot/utils/index.js"

import type { SlashCommand } from '../../bot/types.js'

function status(data: unknown) {
    return !data ? "Offline :red_circle:" : "Online :green_circle:"
}

const desc = "Displays the current server status."
const slashCmdData = new SlashCommandBuilder()
    .setName("status")
    .setDescription(desc)

const statusCmd: SlashCommand<typeof slashCmdData> = {
    name: "status",
    description: desc,
    data: slashCmdData,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply()

        const embed = new EmbedBuilder()
            .setTitle("EarthMC Status Overview")
            .setColor(Colors.Green)
            .setFooter(devsFooter(client))
            .setTimestamp()

        const serverData = await MojangLib.servers.get("join.earthmc.net")
        const auroraData = await database.AuroraDB.getMapData()

        if (serverData && !auroraData) {
            embed.setDescription("The server seems to be up, but the map is unavailable!")
        }
        
        embed.addFields(
            embedField("Server", `${status(serverData)}`, true),
            embedField("Aurora Map", `${status(auroraData)}`, true)
        )

        await interaction.editReply({ embeds: [embed] })
    }
}

export default statusCmd