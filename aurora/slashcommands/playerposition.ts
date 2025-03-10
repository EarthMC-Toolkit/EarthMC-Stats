import {
    type Client, 
    type ChatInputCommandInteraction, 
    Colors, EmbedBuilder, SlashCommandBuilder
} from "discord.js"

import { 
    botDevs, devsFooter, 
    embedField
} from '../../bot/utils/fn.js'

import { Aurora } from "earthmc"

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
            .setFooter(devsFooter(client))
        ], ephemeral: true})

        const ops = await Aurora.Players.online()
        if (!ops) return interaction.reply({embeds: [new EmbedBuilder()
            .setTimestamp()
            .setColor(Colors.Red)
            .setTitle("Connection Issues")
            .setAuthor({
                name: interaction.user.username,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setDescription("Unable to fetch Towny data, the server may be down for maintenance.\n\nPlease try again later.")
            .setFooter(devsFooter(client))
        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

        const foundPlayer = ops.find(op => op.name.toLowerCase() == player.toLowerCase())
        if (foundPlayer && !botDevs.includes(player.toLowerCase())) {
            const acc = foundPlayer.name

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
                .setFooter(devsFooter(client))
                
            if (acc !== foundPlayer.nickname) {
                locationEmbed.addFields(embedField("Nickname", foundPlayer.nickname))
            }
            
            const { x, z } = foundPlayer
            locationEmbed.addFields(
                embedField("Coordinates", `X: ${x}\nZ: ${z}`),
                embedField("Dynmap Link", `[${x}, ${z}](https://map.earthmc.net?worldname=earth&mapname=flat&zoom=6&x=${x}&y=64&z=${z})`)
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
