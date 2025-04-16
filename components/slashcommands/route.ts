import { 
    type Client, 
    type ChatInputCommandInteraction, 
    type SlashCommandIntegerOption,
    EmbedBuilder, 
    SlashCommandBuilder
} from "discord.js"

import { Aurora, Routes } from "earthmc"
import { backtick, embedField } from "../../bot/utils/index.js"

const desc = "Gets the optimal route to a location. Includes the nearest nation and distance/direction from it."

const CoordIntOption = (
    option: SlashCommandIntegerOption, coord: string, 
    min?: number, max?: number
) => {
    option.setName(coord)
    option.setDescription(`The ${coord.toUpperCase()} coordinate.`)
    option.setRequired(true)
        
    if (min) option.setMinValue(min)
    if (max) option.setMaxValue(max)

    return option
}

const slashCmdData = new SlashCommandBuilder()
    .setName("route")
    .setDescription(desc)
    .addSubcommand(subCmd => subCmd.setName("safest")
        .setDescription("Avoids non-public and PVP enabled nations.")
        .addIntegerOption(opt => CoordIntOption(opt, "x", -33280, 33080))
        .addIntegerOption(opt => CoordIntOption(opt, "z", -16640, 16508))
    )
    .addSubcommand(subCmd => subCmd.setName("fastest")
        .setDescription("Avoids no flags. All nations are checked including PVP enabled and non-public ones.")
        .addIntegerOption(opt => CoordIntOption(opt, "x", -33280, 33080))
        .addIntegerOption(opt => CoordIntOption(opt, "z", -16640, 16508))
    )
    .addSubcommand(subCmd => subCmd.setName("avoid_private")
        .setDescription("Avoids only non-public nations. Nearest nation can have PVP enabled.")
        .addIntegerOption(opt => CoordIntOption(opt, "x", -33280, 33080))
        .addIntegerOption(opt => CoordIntOption(opt, "z", -16640, 16508))
    )
    .addSubcommand(subCmd => subCmd.setName("avoid_pvp")
        .setDescription("Avoids only PVP enabled nations. Nearest nation can be non-public.")
        .addIntegerOption(opt => CoordIntOption(opt, "x", -33280, 33080))
        .addIntegerOption(opt => CoordIntOption(opt, "z", -16640, 16508))
    )

function formatDuration(seconds: number) {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60

    return min > 0 ? `${min}m ${sec}s` : `${sec}s`
}

export default {
    name: "route",
    description: desc,
    data: slashCmdData,
    run: async (_: Client, interaction: ChatInputCommandInteraction) => {
        const subCmd = interaction.options.getSubcommand()
        const routeOptions = Routes[subCmd.toUpperCase()] || Routes.AVOID_PRIVATE

        const x = interaction.options.getInteger("x")
        const z = interaction.options.getInteger("z")
        
        // TODO: This assumes the spawn point is always at the capital.
        //       We should instead check which town is at the spawn point and get flags from that.
        const { nation, direction, distance, travelTimes } = await Aurora.GPS.findRoute({ x, z }, routeOptions)

        const directionStr = direction.charAt(0).toUpperCase() + direction.slice(1)
        const distanceStr = distance.toLocaleString() // Adds commas

        const travelTimesArr = [
            `Sprint: ${formatDuration(travelTimes.sprinting)}`,
            `Walk: ${formatDuration(travelTimes.walking)}`,
            // `Sneak: ${formatDuration(travelTimes.sneaking)}`,
            `Boat: ${formatDuration(travelTimes.boat)}`
        ]

        const { capital } = nation

        const embed = new EmbedBuilder()
            .setColor("Random")
            .setTitle(`Route to ${backtick(x)}, ${backtick(z)}`)
            .setDescription(`**TLDR**: /n spawn ${backtick(nation.name)} and head ${backtick(directionStr)} for ${backtick(distanceStr)} blocks.`)
            .setFields(
                embedField(
                    "Nearest Nation",
                    `Name: ${nation.name}\nCapital: ${capital.name}\nCapital Location: ${capital.x}, ${capital.z}`, 
                    true
                ),
                embedField(
                    "Route (Nation -> Point)", 
                    `Distance: ${distanceStr} blocks\nDirection: ${directionStr}\n\nTravel Times:\n${travelTimesArr.join("\n")}`, 
                    true
                )
            )

        return interaction.reply({ embeds: [embed] })
    }
}