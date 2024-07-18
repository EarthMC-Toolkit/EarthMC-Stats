import {
    type Client, 
    type ChatInputCommandInteraction,
    Colors, EmbedBuilder, SlashCommandBuilder
} from "discord.js"

import * as fn from '../../bot/utils/fn.js'
import { Aurora } from 'earthmc'

const embed = (len: number, desc: string, footer?: { text: string, iconURL: string }) => {
    const builder = new EmbedBuilder()
        .setColor(Colors.DarkPurple)
        .setTitle(`Townless Players [${len}]`)
        .setDescription(desc)
        .setTimestamp()

    if (footer) builder.setFooter(footer)
    return builder
}

export default {
    name: "townless",
    description: "Lists all online players without a town.",
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        const townlessPlayers = await Aurora.Players.townless().catch(() => null) 
        if (!townlessPlayers) return await interaction.reply({embeds: [fn.fetchError], ephemeral: true})

        const townlessLen = townlessPlayers.length
        const allData = townlessPlayers.map(player => player.name).join('\n').match(/(?:^.*$\n?){1,10}/mg)
        const len = allData.length

        const page = 0
        const botembed = []

        if (townlessLen < 1) {
            return interaction.reply({
                embeds: [embed(0, "There are currently no townless players.")], 
                ephemeral: true
            })
        }
        
        if (len <= 1) { // If only one page, don't create paginator.   
            return interaction.reply({embeds: [
                embed(townlessLen, "```" + townlessPlayers[0].name + "\n" + allData.toString() + "```")
            ]})
        }
        
        for (let i = 0; i < len; i++) {
            botembed[i] = embed(
                townlessLen, 
                "```" + townlessPlayers[0].name + "\n" + allData[i] + "```",
                { text: `Page ${++i}/${len}`, iconURL: client.user.avatarURL() }
            )
        }

        await interaction.reply({ embeds: [botembed[page]] })
            .then(() => fn.paginatorInteraction(interaction, botembed, page))
            .catch(console.log)
    }, data: new SlashCommandBuilder()
        .setName("townless")
        .setDescription("Lists all online townless players.")
}