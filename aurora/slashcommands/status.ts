import {
    type Client,
    ChatInputCommandInteraction,
    Colors, EmbedBuilder
} from "discord.js"

import { MojangLib } from 'earthmc'

import * as fn from '../../bot/utils/fn.js'
import * as database from "../../bot/utils/database.js"
      
const status = data => !data ? "Offline :red_circle:" : "Online :green_circle:"

export default {
    name: "status",
    description: "Displays the current server status.",
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply()

        const embed = new EmbedBuilder()
            .setTitle("EarthMC Status Overview")
            .setColor(Colors.Green)
            .setThumbnail("https://cdn.discordapp.com/attachments/586135349978333194/672542598354698273/emclogo.png")
            .setFooter(fn.devsFooter(client))
            .setTimestamp()

        const serverData = await MojangLib.servers.get("play.earthmc.net").catch(() => {}),
              auroraData = await database.Aurora.getTownyData().catch(() => {}),
              novaData = await database.Nova.getTownyData().catch(() => {})

        if (serverData && (!auroraData && !novaData))
            embed.setDescription("The server seems to be up, but dynmap is unavailable!")
        
        embed.addFields(
            fn.embedField("Server", `${status(serverData)}`),
            fn.embedField("Aurora", `${status(auroraData)}`),
            fn.embedField("Nova", `${status(novaData)}`)
        )

        await interaction.editReply({embeds: [embed]})
    }
}