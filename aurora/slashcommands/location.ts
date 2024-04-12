import {
    type Client, 
    type ChatInputCommandInteraction,
    Colors, EmbedBuilder, SlashCommandBuilder
} from 'discord.js'

import * as fn from '../../bot/utils/fn.js'

export default {
    name: "location",
    description: "Converts 2 coordinates into a clickable map link.",
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        const get = interaction.options.getInteger
        const xcoord = get("x"), 
              zcoord = get("z"), 
              zoom = get("zoom")
      
        if (!xcoord || !zcoord || isNaN(xcoord) || isNaN(zcoord)) {
            return interaction.reply({embeds: [new EmbedBuilder()
                .setColor(Colors.Red)
                .setTitle("Error while using /location:")
                .setDescription("Invalid arguments!\n\nUsage: `/loc xcoord zcoord`")
                .setFooter(fn.devsFooter(client)).setTimestamp()
            ], ephemeral: true})
        } else if (Number(xcoord) >= 33081 || Number(xcoord) < -33280 || Number(zcoord) >= 16508 || Number(zcoord) < -16640) {
            return interaction.reply({embeds: [new EmbedBuilder()
                .setTitle("Error while using /location:")
                .setColor(Colors.Red)
                .setDescription("Please enter 2 values that are inside EarthMC's world border.")
                .setFooter(fn.devsFooter(client)).setTimestamp()
            ], ephemeral: true})
        }
        else {
            const dynmapLink = `[Click here](https://earthmc.net/map/aurora/?worldname=earth&mapname=flat&zoom=${zoom ?? 4}&x=${xcoord}&y=64&z=${zcoord})`
            const embed = new EmbedBuilder()
                .setColor(Colors.Green)
                .setTitle("Map location for X:" + xcoord + ", Z:" + zcoord)
                .addFields(fn.embedField("Dynmap Link", dynmapLink))
                .setFooter(fn.devsFooter(client))
                .setTimestamp()

            if (zoom) embed.addFields(fn.embedField("Zoom", zoom.toString() + 'x'))
            if (!isNaN(zoom) && Number(zoom) < 11) return interaction.reply({embeds: [embed]})
            else interaction.reply({embeds: [new EmbedBuilder()
                .setTitle("Error while using /location:")
                .setColor(Colors.Red)
                .setDescription("`" + zoom + "`" + " is not a valid zoom! Please use a number from 1-10.")
                .setFooter(fn.devsFooter(client)).setTimestamp()
            ], ephemeral: true })
        }
    }, data: new SlashCommandBuilder()
        .setName("location")
        .setDescription("Converts 2 coordinates into a clickable map link.")
        .addIntegerOption(option => option.setName("x").setDescription("The x coordinate.").setRequired(true))
        .addIntegerOption(option => option.setName("z").setDescription("The z coordinate.").setRequired(true))
        .addIntegerOption(option => option.setName("zoom").setDescription("The amount of zoom to use."))
}