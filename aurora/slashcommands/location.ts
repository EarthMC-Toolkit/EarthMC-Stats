import { 
    Aurora, OfficialAPI,
    type RawLocationResponseV3
} from 'earthmc'

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
    inWorldBorder
} from '../../bot/utils/fn.js'

const defaultEmbed = (
    client: Client, 
    title = "Error while using /location:", 
    colour: ColorResolvable = Colors.Red
) => new EmbedBuilder()
    .setTitle(title)
    .setColor(colour)
    .setFooter(devsFooter(client))
    .setTimestamp()

const desc = "Utility commands for all things location related."
const slashCmdData = new SlashCommandBuilder()
    .setName("location")
    .setDescription(desc)
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
    description: desc,
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

// Only use when town name is available
const buildAffiliation = (loc: RawLocationResponseV3) => {
    const affiliation = `Belongs to: ${backtick(loc.town.name)}`
    return loc.nation?.name ? `${affiliation} (${backtick(loc.nation.name)})` : affiliation
}

const runCheck = async (client: Client, interaction: ChatInputCommandInteraction) => {
    const xCoord = interaction.options.getInteger("x")
    const zCoord = interaction.options.getInteger("z")

    //#region Validate X and Z coords.
    if (!xCoord || !zCoord) {
        return interaction.reply({embeds: [defaultEmbed(client)
            .setDescription("Invalid arguments!\n\nUsage: `/loc <x> <z>`")
        ], ephemeral: true})
    }

    if (inWorldBorder(xCoord, zCoord)) {
        return interaction.reply({embeds: [defaultEmbed(client)
            .setDescription("Specified coordinates are not inside EarthMC's world border!")
        ]}).then(m => setTimeout(() => m.delete(), 10000))
    }
    //#endregion

    //#region Defer reply and respond when we have OAPI data.
    await interaction.deferReply()

    const coords: [number, number] = [xCoord, zCoord]
    const loc = await OfficialAPI.V3.location(coords).then(arr => arr[0])
    
    const embed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setTitle(`Location Info | ${backtick(xCoord)}, ${backtick(zCoord)}`)

    const townName = loc.town?.name
    if (loc.isWilderness) {
        embed.setDescription(townName
            ? `Location is marked as wilderness but a town is provided. *Schrödinger's location..*\n\n${buildAffiliation(loc)}`
            : `This location is wilderness and does not belong to a town.`
        )
    } else {
        embed.setDescription(townName 
            ? buildAffiliation(loc)
            : `This location doesn't belong to a town yet isn't wilderness.\nThe Official API hurt itself in it's own confusion.`
        )
    }

    return interaction.editReply({ embeds: [embed] })
}

const runMapLink = (client: Client, interaction: ChatInputCommandInteraction) => {
    const xCoord = interaction.options.getInteger("x")
    const zCoord = interaction.options.getInteger("z")

    //#region Validate X and Z coords.
    if (!xCoord || !zCoord) {
        return interaction.reply({embeds: [defaultEmbed(client)
            .setDescription("Invalid arguments!\n\nUsage: `/loc <x> <z>` or `/loc <x> <z> <zoom>`")
        ], ephemeral: true})
    }

    if (inWorldBorder(xCoord, zCoord)) {
        return interaction.reply({embeds: [defaultEmbed(client)
            .setDescription("Specified coordinates are not inside EarthMC's world border!")
        ]}).then(m => setTimeout(() => m.delete(), 10000))
    }
    //#endregion

    const zoom = interaction.options.getInteger("zoom")
    const mapUrl = new Aurora.URLBuilder({ x: xCoord, z: zCoord }, zoom)

    let reqDetails = `Coordinates: ${xCoord}, ${zCoord}`
    if (zoom) reqDetails += `\nZoom: ${zoom}x`

    const mapLinkEmbed = defaultEmbed(client, `Location Info | Map Link`)
        .setDescription(`Here is the [map link](${mapUrl.getAsString()}) for the your request:\n\n${reqDetails}`)
        .setColor(Colors.Green)

    return interaction.reply({ embeds: [mapLinkEmbed] })
}