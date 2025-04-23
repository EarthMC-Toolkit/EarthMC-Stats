import {
    type Client,
    type ChatInputCommandInteraction,
    EmbedBuilder, SlashCommandBuilder,
    Colors
} from "discord.js" 

import {
    embedField, 
    getUserCount,
    devsFooter
} from '../../bot/utils/index.js'

import type { SlashCommand } from '../../bot/types.js'

const desc = "Sends bot-related statistics."
const slashCmdData = new SlashCommandBuilder()
    .setName("stats")
    .setDescription(desc)

const statsCmd: SlashCommand<typeof slashCmdData> ={
    name: "stats",
    description: "Sends bot-related statistics",
    data: slashCmdData,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {    
        return interaction.reply({embeds: [new EmbedBuilder()
            .setColor(Colors.Green)
            .setTitle("Bot Statistics")
            .setThumbnail(client.user.avatarURL())
            .addFields(
                embedField("Total Servers: ", client.guilds.cache.size.toString(), true),
                embedField("Total Users: ", getUserCount(client).toString(), true)
            )
            .setTimestamp()
            .setFooter(devsFooter(client))
        ]})
    }
}

export default statsCmd