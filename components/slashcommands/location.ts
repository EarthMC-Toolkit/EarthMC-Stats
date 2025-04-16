import { 
    Aurora, OfficialAPI,
    type LocationResObjectV3
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
} from '../../bot/utils/index.js'

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
const buildAffiliation = (loc: LocationResObjectV3) => {
    const affiliation = `Belongs to: ${backtick(loc.town.name)}`
    return loc.nation?.name ? `${affiliation} (${backtick(loc.nation.name)})` : affiliation
}

const runCheck = async (client: Client, interaction: ChatInputCommandInteraction) => {
    const xCoord = interaction.options.getInteger("x")
    const zCoord = interaction.options.getInteger("z")

    //#region Validate X and Z coords.
    if (inWorldBorder(xCoord, zCoord)) {
        const embed = defaultEmbed(client)
            .setDescription("Specified coordinates are not inside EarthMC's world border!")

        return interaction.reply({ embeds: [embed], ephemeral: true })
            .then(m => setTimeout(() => m.delete(), 10000))
    }
    //#endregion

    //#region Defer reply and respond when we have OAPI data.
    await interaction.deferReply()

    const coords: [number, number] = [xCoord, zCoord]
    const loc = await OfficialAPI.V3.location(coords).then(arr => arr[0])
    if (!loc) return interaction.editReply({embeds: [defaultEmbed(client)
        .setDescription("Failed to fetch location from the Official API.")
    ]})  

    const embed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setTitle(`Location Info | ${backtick(xCoord)}, ${backtick(zCoord)}`)

    const townName = loc.town?.name
    let desc = ""

    if (loc.isWilderness) {
        desc = townName
            ? `Location is marked as wilderness but a town is provided. *Schrödinger's location..*\n\n${buildAffiliation(loc)}`
            : `This location is wilderness and does not belong to a town.`
    } else {
        desc = townName 
            ? buildAffiliation(loc)
            : `This location doesn't belong to a town yet isn't wilderness.\nThe Official API hurt itself in it's own confusion.`
    }

    // This is pretty much the whole map, there should be some town(s) within this.
    const radius = { x: 30000, z: 15000 }
    const nearbyTowns = (await Aurora.Towns.nearby({ x: xCoord, z: zCoord }, radius)).sort((a, b) => {
        const distA = Math.abs(a.x - xCoord) + Math.abs(a.z - zCoord)
        const distB = Math.abs(b.x - xCoord) + Math.abs(b.z - zCoord)
        
        // The result array isn't sorted by closest, so we have to do it. 
        return distA - distB
    })

    // Only provide extra info in the case we got nearby towns. Though it is rare we wouldn't.
    if (nearbyTowns.length > 0) {
        desc += "\n\n**Closest Towns**:\n"
        
        // Limit to 5 items and avoid OOB if arr has less than 5 already.
        nearbyTowns.length = Math.min(nearbyTowns.length, 5)

        // We just rawdoggin strings :^)
        for (let i = 0; i < nearbyTowns.length; i++) {
            const town = nearbyTowns[i]
            const dist = Math.abs(town.x - xCoord) + Math.abs(town.z - zCoord)

            let str = town.nation ? `${town.name} (${town.nation})` : town.name
            str += ` - ${backtick(dist)}m | ${backtick(town.x)}, ${backtick(town.z)}`

            // Don't add new line to last town string.
            if (i < nearbyTowns.length - 1) { 
                str += "\n"
            }

            desc += str
        }
    }

    embed.setDescription(desc)

    return interaction.editReply({ embeds: [embed] })
}

const runMapLink = (client: Client, interaction: ChatInputCommandInteraction) => {
    const xCoord = interaction.options.getInteger("x")
    const zCoord = interaction.options.getInteger("z")

    //#region Validate X and Z coords.
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