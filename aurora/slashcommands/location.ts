import {
    type Client, 
    type ChatInputCommandInteraction,
    Colors, EmbedBuilder, SlashCommandBuilder,
    type ColorResolvable
} from 'discord.js'

import { devsFooter, inWorldBorder } from '../../bot/utils/fn.js'
import { Aurora } from 'earthmc'

const embed = (
    client, 
    title = "Error while using /location:", 
    colour: ColorResolvable = Colors.Red
) => new EmbedBuilder()
    .setTitle(title)
    .setColor(colour)
    .setFooter(devsFooter(client))
    .setTimestamp()

export default {
    name: "location",
    description: "Converts 2 coordinates into a clickable map link.",
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        const xCoord = interaction.options.getInteger("x")
        const zCoord = interaction.options.getInteger("z")
        const zoom = interaction.options.getInteger("zoom")
      
        if (!xCoord || !zCoord || isNaN(xCoord) || isNaN(zCoord)) {
            return interaction.reply({embeds: [new EmbedBuilder()
                .setColor(Colors.Red)
                .setTitle("Error while using /location:")
                .setDescription("Invalid arguments!\n\nUsage: `/loc <x> <z>` or `/loc <x> <z> <zoom>`")
                .setFooter(devsFooter(client))
                .setTimestamp()
            ], ephemeral: true})
        } 
        
        const numX = Number(xCoord)
        const numZ = Number(zCoord)

        if (inWorldBorder(numX, numZ)) return interaction.reply({embeds: [
            embed(client).setDescription("Specified coordinates are not inside EarthMC's world border!")
        ]}).then(m => setTimeout(() => m.delete(), 10000))
        
        const mapUrl = Aurora.buildMapLink(zoom, { x: numX, z: numZ })
        return interaction.reply({embeds: [new EmbedBuilder()
            .setTitle(`Map Location Info`)
            .setDescription(`
                [Open in browser](${mapUrl.toString()})\n\n
                X Coord: ${numX}\n
                Z Coord: ${numZ}\n
                Zoom: ${zoom}
            `)
            .setColor(Colors.Green)
            .setFooter(devsFooter(client))
            .setTimestamp()
        ]})

        // interaction.reply({embeds: [new EmbedBuilder()
        //     .setTitle("Error while using /location:")
        //     .setDescription(`\`${zoom}\` is not a valid zoom! Please use a number from 1-6.`)
        //     .setColor(Colors.Red)
        //     .setFooter(devsFooter(client))
        //     .setTimestamp()
        // ], ephemeral: true })
    }, data: new SlashCommandBuilder()
        .setName("location")
        .setDescription("Converts 2 coordinates (and optional zoom) into a clickable map link.")
        .addIntegerOption(option => option
            .setName("x")
            .setDescription("The coordinate on the X axis (left/right).")
            .setRequired(true)
        )
        .addIntegerOption(option => option
            .setName("z")
            .setDescription("The coordinate on the Z axis (up/down).")
            .setRequired(true)
        )
        .addIntegerOption(option => option
            .setName("zoom")
            .setDescription("Map zoom scale/factor.")
            .setMaxValue(6)
            .setMinValue(0)
        )
}