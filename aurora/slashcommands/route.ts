import { 
    type Client, 
    type ChatInputCommandInteraction, 
    type SlashCommandIntegerOption,
    EmbedBuilder, 
    SlashCommandBuilder
} from "discord.js"

import { Aurora } from "earthmc"
import { embedField } from "../../bot/utils/fn.js"

const desc = "Returns info on how to get to a location quickly or safely."

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

export default {
    name: "route",
    description: desc,
    run: async (_: Client, interaction: ChatInputCommandInteraction) => {
        const x = interaction.options.getInteger("x")
        const z = interaction.options.getInteger("z")
        
        const route = await Aurora.GPS.fastestRoute({ x, z })
        const direction = route.direction.charAt(0).toUpperCase() + route.direction.slice(1)

        const embed = new EmbedBuilder()
            .setColor("Random")
            .setFields(
                embedField("Nearest Nation", `/n spawn ${route.nation.name}`,  true),
                embedField("Distance", `${route.distance} blocks`, true),
                embedField("Direction", direction, true),
            )

        return interaction.reply({ embeds: [embed] })
    }, data: new SlashCommandBuilder()
        .setName("route")
        .setDescription(desc)
        .addIntegerOption(opt => CoordIntOption(opt, "x", -33280, 33081))
        .addIntegerOption(opt => CoordIntOption(opt, "z", -16640, 16508))
}