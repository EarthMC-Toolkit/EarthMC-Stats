import { Aurora, OfficialAPI } from 'earthmc'

import {
    type Client, 
    type ChatInputCommandInteraction,
    type ColorResolvable,
    Colors, EmbedBuilder,
    SlashCommandBuilder
} from 'discord.js'

import { 
    backtick,
    devsFooter, 
    embedField, 
    inWorldBorder
} from '../../bot/utils/fn.js'

const embed = (
    client: Client, 
    title = "Error while using /location:", 
    colour: ColorResolvable = Colors.Red
) => new EmbedBuilder()
    .setTitle(title)
    .setColor(colour)
    .setFooter(devsFooter(client))
    .setTimestamp()

const slashCmdData = new SlashCommandBuilder()
    .setName("location")
    .setDescription("Utility commands for all things location related.")
    .addSubcommand(subCmd => subCmd.setName("check")
        .setDescription("Is this wilderness or is this divine intellect?")
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
    )
    .addSubcommand(subCmd => subCmd.setName("maplink")
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
    )

export default {
    name: "location",
    data: slashCmdData,
    description: "",
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        const subCmd = interaction.options.getSubcommand()

        switch (subCmd) {
            case "maplink": {
                return runMapLink(client, interaction)
            }
            case "check":
            default: {
                return runCheck(client, interaction)
            }
        }
    }
}

const runCheck = async (client: Client, interaction: ChatInputCommandInteraction) => {
    const xCoord = interaction.options.getInteger("x")
    const zCoord = interaction.options.getInteger("z")

    //#region Validate X and Z coords.
    if (!xCoord || !zCoord) {
        return interaction.reply({embeds: [embed(client)
            .setDescription("Invalid arguments!\n\nUsage: `/loc <x> <z>`")
        ], ephemeral: true})
    }

    if (inWorldBorder(xCoord, zCoord)) {
        return interaction.reply({embeds: [embed(client)
            .setDescription("Specified coordinates are not inside EarthMC's world border!")
        ]}).then(m => setTimeout(() => m.delete(), 10000))
    }
    //#endregion

    //#region Defer reply and respond when we have OAPI data.
    await interaction.deferReply()

    const coords: [number, number] = [xCoord, zCoord]
    const loc = await OfficialAPI.V3.location(coords)
    
    const { town, nation } = loc

    cosnt embed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setTitle(`Location Info | ${backtick(xCoord)}, ${backtick(zCoord)}`)
        .addFields(
            embedField("Wilderness", loc.isWilderness ? "Yes" : "No")
        )

    return interaction.editReply()
}

const runMapLink = (client: Client, interaction: ChatInputCommandInteraction) => {
    const xCoord = interaction.options.getInteger("x")
    const zCoord = interaction.options.getInteger("z")

    //#region Validate X and Z coords.
    if (!xCoord || !zCoord) {
        return interaction.reply({embeds: [embed(client)
            .setDescription("Invalid arguments!\n\nUsage: `/loc <x> <z>` or `/loc <x> <z> <zoom>`")
        ], ephemeral: true})
    }

    if (inWorldBorder(xCoord, zCoord)) {
        return interaction.reply({embeds: [embed(client)
            .setDescription("Specified coordinates are not inside EarthMC's world border!")
        ]}).then(m => setTimeout(() => m.delete(), 10000))
    }
    //#endregion

    const zoom = interaction.options.getInteger("zoom")

    const mapUrl = new Aurora.URLBuilder({ x: xCoord, z: zCoord }, zoom)

    let reqDetails = `Coordinates: ${xCoord}, ${zCoord}`
    if (zoom) reqDetails += `\nZoom: ${zoom}x`

    const mapLinkEmbed = embed(client, `Location Info | Map Link`)
        .setDescription(`Here is the [map link](${mapUrl.getAsString()}) for the your request:\n\n${reqDetails}`)
        .setColor(Colors.Green)

    return interaction.reply({ embeds: [mapLinkEmbed] })
}