import {
    type Client, 
    type ChatInputCommandInteraction, 
    Colors, EmbedBuilder, SlashCommandBuilder
} from "discord.js"

import striptags from 'striptags'

import * as db from "../../bot/utils/database.js"
import * as fn from '../../bot/utils/fn.js'

export default {
    name: "playerposition",
    description: "Get a players current location.",
	run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        const player = interaction.options.getString("player")
        if (!player) return interaction.reply({embeds: [new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle("Error while using /playerposition:")
            .setDescription("Not enough arguments, please provide a valid playername.")
            .setTimestamp()
            .setFooter(fn.devsFooter(client))
        ], ephemeral: true})

        const opsData = await db.Aurora.getOnlinePlayerData()
        if (!opsData) return interaction.reply({embeds: [new EmbedBuilder()
            .setTimestamp()
            .setColor(Colors.Red)
            .setTitle("Connection Issues")
            .setAuthor({name: interaction.user.username, iconURL: interaction.user.displayAvatarURL()})
            .setDescription("Unable to fetch Towny data, the server may be down for maintenance.\n\nPlease try again later.")
            .setFooter(fn.devsFooter(client))
        ]}).then((m: any) => setTimeout(() => m.delete(), 10000)).catch(() => {})

        const ops = opsData.players
        const foundPlayer = ops.find(op => op.account.toLowerCase() == player.toLowerCase())
          
        if (foundPlayer && !fn.botDevs.includes(player.toLowerCase())) {
            const acc = foundPlayer.account

            if (foundPlayer.world == "-some-other-bogus-world-") {
                return interaction.reply({embeds: [new EmbedBuilder()
                    .setTitle("Location Unavailable")
                    .setDescription(`${acc} seems to be invisible, under a block, or in the nether. Please try again later.`)
                    .setColor(Colors.DarkGold)
                    .setTimestamp()
                ], ephemeral: true})
            }

            const locationEmbed = new EmbedBuilder()
                .setTitle("Location Info | " + acc)
                .setThumbnail(`https://crafatar.com/avatars/${acc}/256.png`)
                .setColor(Colors.DarkVividPink)
                .setTimestamp()
                .setFooter(fn.devsFooter(client))
                
            const foundPlayerNickname = striptags(foundPlayer.name)
            if (acc !== foundPlayerNickname)
                locationEmbed.addFields(fn.embedField("Nickname", foundPlayerNickname))
            
            const { x, y, z } = foundPlayer
            locationEmbed.addFields(
                fn.embedField("Coordinates", `X: ${x}\nY: ${Number(y) - 1}\nZ: ${z}`),
                fn.embedField("Dynmap Link", `[${x}, ${z}](https://earthmc.net/map/aurora/?worldname=earth&mapname=flat&zoom=6&x=${x}&y=64&z=${z})`)
            )

            return interaction.reply({ embeds: [locationEmbed] }).catch(() => {})
        }
        
        return interaction.reply({embeds: [new EmbedBuilder()
            .setTitle("Error fetching player")
            .setDescription(player + " isn't online or does not exist!")
            .setTimestamp()
            .setColor(Colors.Red)
        ], ephemeral: true})
    }, data: new SlashCommandBuilder()
        .setName("playerposition")
        .setDescription("Get a players current location.")
        .addStringOption(option => option.setName("player").setDescription("The player to get the location for.").setRequired(true))
}
