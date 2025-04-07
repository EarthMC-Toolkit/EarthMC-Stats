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

import { 
    staffResponse,
    type StaffRole, type StaffRoleOrUnknown
} from "../../bot/types.js"

const slashCmdData = new SlashCommandBuilder()
    .setName("staff")
    .setDescription("Show a list of either active or online staff.")
    .addSubcommand(subCmd => subCmd.setName('list').setDescription('List of all active staff members.'))
    .addSubcommand(subCmd => subCmd.setName('online').setDescription('List of staff currently online.'))

// All roles as array with extra 'unknown' role last in case of OAPI failure.
export const roleOrder: StaffRoleOrUnknown[] = [
    ...Object.keys(staffResponse) as StaffRole[], 
    "unknown"
]

export async function displayStaff(
    client: Client, interaction: ChatInputCommandInteraction, 
    embedColour: ColorResolvable,
    online: boolean
) {
    let onlineStaff = (await getStaff())
    if (online) onlineStaff = onlineStaff.filter(sm => sm.player.status.isOnline)

    // Sort alphabetically
    //const sorted = onlineStaff.sort((sm1, sm2) => sm1.player.name.localeCompare(sm2.player.name))

    // Sort by role
    const sorted = onlineStaff.sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role))

    const data = sorted.map(sm => {
        const town = sm.player.town?.name
        const nation = sm.player.nation?.name

        const role = sm.role == "unknown" ? "Unknown Role" : sm.role
        const capitalizedRole = role == "staffmanager" ? "Staff Manager" : role.charAt(0).toUpperCase() + role.slice(1)

        const affiliation = !town ? "Townless" : (nation ? `${town} (${nation})` : town)
        return `**${capitalizedRole}** | ${backtick(sm.player.name)} - ${affiliation}`
    }).join("\n").match(/(?:^.*$\n?){1,10}/mg)

    const embeds: EmbedBuilder[] = []

    const len = data.length
    for (let i = 0; i < len; i++) {
        embeds[i] = new EmbedBuilder()
            .setTitle(online ? "Online Activity | Staff" : "Staff List")
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