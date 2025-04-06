import {
    type Client,
    type ChatInputCommandInteraction,
    type ColorResolvable,
    Colors, EmbedBuilder, SlashCommandBuilder
} from "discord.js"

import { 
    devsFooter, 
    getStaff,
    backtick,
    paginatorInteraction
} from '../../bot/utils/fn.js'

const slashCmdData = new SlashCommandBuilder()
    .setName("staff")
    .setDescription("Show a list of either active or online staff.")
    .addSubcommand(subCmd => subCmd.setName('list').setDescription('List of all active staff members.'))
    .addSubcommand(subCmd => subCmd.setName('online').setDescription('List of staff currently online.'))

export async function displayStaff(
    client: Client, interaction: ChatInputCommandInteraction, 
    embedColour: ColorResolvable,
    online: boolean
) {
    let onlineStaff = (await getStaff())
    if (online) onlineStaff = onlineStaff.filter(sm => sm.player.status.isOnline)

    // Alphabetical
    const sorted = onlineStaff.sort((sm1, sm2) => sm1.player.name.localeCompare(sm2.player.name))

    const data = sorted.map(sm => {
        const town = sm.player.town?.name
        const nation = sm.player.nation?.name

        const role = sm.role == "Unknown" ? "**Unknown Role**" : `**${sm.role}**`
        const affiliation = !town ? "Townless" : (nation ? `${town} (${nation})` : town)

        return `${role} | ${backtick(sm.player.name)} - ${affiliation}`
    }).join("\n").match(/(?:^.*$\n?){1,10}/mg)

    const embeds: EmbedBuilder[] = []

    const len = data.length
    for (let i = 0; i < len; i++) {
        embeds[i] = new EmbedBuilder()
            .setTitle("Online Activity | Staff")
            .setDescription(data[i])
            .setColor(embedColour)
            .setFooter(devsFooter(client))
            .setTimestamp()
    }

    return await interaction.editReply({ embeds: [embeds[0]] })
        .then(() => paginatorInteraction(interaction, embeds, 0))
}

export default {
    name: "staff",
    description: "Sends a list of current server staff",
    data: slashCmdData,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply()

        const subCmd = interaction.options.getSubcommand()
        switch (subCmd) {
            case "online": {
                displayStaff(client, interaction, "Random", true)
                break
            }
            case "list": {
                displayStaff(client, interaction, "Random", false)
                break
            }
            default: return await interaction.editReply({ embeds: [new EmbedBuilder()
                .setTitle("Invalid Arguments!")
                .setDescription("Usage: `/staff list` or `/staff online`")
                .setColor(Colors.Red)
                .setThumbnail(client.user.avatarURL())
                .setFooter(devsFooter(client))
                .setTimestamp()
            ]})
        }
    }
}