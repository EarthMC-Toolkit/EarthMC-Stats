import {
    type Client, 
    type ChatInputCommandInteraction,
    Colors, EmbedBuilder, SlashCommandBuilder,
    type ColorResolvable
} from 'discord.js'

import { devsFooter, embedField, inWorldBorder } from '../../bot/utils/fn.js'
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
            return interaction.reply({embeds: [
                embed(client, "Error while using /location:", Colors.Red)
                .setDescription("Invalid arguments!\n\nUsage: `/loc <x> <z>` or `/loc <x> <z> <zoom>`")
            ], ephemeral: true})
        } 
        
        const numX = Number(xCoord)
        const numZ = Number(zCoord)

        if (inWorldBorder(numX, numZ)) return interaction.reply({embeds: [
            embed(client).setDescription("Specified coordinates are not inside EarthMC's world border!")
        ]}).then(m => setTimeout(() => m.delete(), 10000))
        
        if (!zoom) {
            const mapUrl = Aurora.buildMapLink({ x: xCoord, z: zCoord })
            return interaction.reply({embeds: [
                embed(client, `(Aurora) Location Info`, Colors.Green)
                .addFields(
                    embedField("Coordinates (X, Z)", `X: \`${numX}\`\nZ: \`${numZ}\``, true),
                    embedField("Map Link", `[Click to open](${mapUrl.toString()})`)
                )
            ]})
        }

        const mapUrl = Aurora.buildMapLink({ x: numX, z: numZ }, zoom)
        return interaction.reply({embeds: [
            embed(client, `(Aurora) Location Info`, Colors.Green)
            .addFields(
                embedField("Coordinates (X, Z)", `X: \`${numX}\`\nZ: \`${numZ}\``, true),
                embedField("Zoom", `\`${zoom}\`x`, true),
                embedField("Map Link", `[Click to open](${mapUrl.toString()})`)
            )
        ]})
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