import { Aurora } from "earthmc"

import {
    type Client, 
    type ChatInputCommandInteraction, 
    Colors, EmbedBuilder, SlashCommandBuilder
} from "discord.js"

import { 
    buildSkinURL,
    devsFooter,
    embedField
} from '../../bot/utils/fn.js'

import * as MC from '../../bot/utils/minecraft.js'
import { type MCSessionProfile, SkinType3D } from "../../bot/types.js"

const slashCmdData = new SlashCommandBuilder()
    .setName("playerposition")
    .setDescription("Get a players current location.")
    .addStringOption(option => option.setName("player")
        .setDescription("The player to get the location for.")
        .setRequired(true)
    )

export default {
    name: "playerposition",
    description: "Get a players current location.",
    data: slashCmdData,
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
        if (!foundPlayer) return interaction.reply({embeds: [new EmbedBuilder()
            .setTitle("Error fetching player")
            .setDescription(`${player} is hidden/offline or does not exist!`)
            .setTimestamp()
            .setColor(Colors.Red)
        ], ephemeral: true})

        const name = foundPlayer.name

        if (foundPlayer.world == "-some-other-bogus-world-") {
            return interaction.reply({embeds: [new EmbedBuilder()
                .setTitle("Location Unavailable")
                .setDescription(`${name} seems to be invisible, under a block, or in the nether. Please try again later.`)
                .setColor(Colors.DarkGold)
                .setTimestamp()
            ], ephemeral: true})
        }

        const locationEmbed = new EmbedBuilder()
            .setTitle(`Location Info | ${name}`)
            .setColor(Colors.DarkVividPink)
            .setTimestamp()
            .setFooter(devsFooter(client))
            
        const mcProf: MCSessionProfile = await MC.Players.get(name).catch(() => null)
        if (mcProf != null) {
            locationEmbed.setThumbnail(buildSkinURL({ 
                view: SkinType3D.BUST, 
                subject: mcProf.id
            }))
        }

        if (name !== foundPlayer.nickname) {
            locationEmbed.addFields(embedField("Nickname", foundPlayer.nickname))
        }
        
        const { x, z } = foundPlayer
        locationEmbed.addFields(
            embedField("Coordinates", `X: ${x}\nZ: ${z}`),
            embedField("Map Link", `[${x}, ${z}](https://map.earthmc.net?x=${x}&z=${z}&zoom=5)`)
        )

        return interaction.reply({ embeds: [locationEmbed] }).catch(() => {})
    }
}
