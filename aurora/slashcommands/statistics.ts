import {
    type Client,
    type ChatInputCommandInteraction,
    Colors, EmbedBuilder
} from "discord.js" 

import {
    embedField, 
    getUserCount,
    devsFooter
} from '../../bot/utils/fn.js'

export default {
    name: "stats",
    description: "Sends bot-related statistics",
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