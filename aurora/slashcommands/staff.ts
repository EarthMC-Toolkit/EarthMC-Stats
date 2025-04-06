import {
    type Client,
    type ChatInputCommandInteraction,
    Colors, EmbedBuilder, SlashCommandBuilder
} from "discord.js"

import { 
    devsFooter, 
    staffListEmbed,
    getStaff
} from '../../bot/utils/fn.js'

// const getStaff = async (activeOnly: boolean) => {
//     const players = await database.getPlayers()
//     const staffList = activeOnly ? staff.active : staff.all()

//     const staffPlayers = players.filter(p => staffList.some(sm => sm.toLowerCase() == p.name.toLowerCase()))
//     return staffPlayers.map(player => {
//         const id = player?.linkedID
//         return (!id || id == '') ? player.name.replace(/_/g, "\\_") : `<@${id}>`
//     })
// }

const slashCmdData = new SlashCommandBuilder()
    .setName("staff")
    .setDescription("Show a list of either active or online staff.")
    .addSubcommand(subCmd => subCmd.setName('list').setDescription('List of all active staff members.'))
    .addSubcommand(subCmd => subCmd.setName('online').setDescription('List of staff currently online.'))

export default {
    name: "staff",
    description: "Sends a list of current server staff",
    data: slashCmdData,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply()

        const subCmd = interaction.options.getSubcommand()
        switch (subCmd) {
            case "online": {
                // const ops = await Aurora.Players.online().catch(() => {})
                // if (!ops) return await interaction.reply({ 
                //     embeds: [fetchError]
                //     //ephemeral: true
                // })

                const onlineStaff = (await getStaff()).filter(sm => sm.player.status.isOnline).map(sm => sm.player.name)
                const list = "```" + onlineStaff.join(", ").toString() + "```"

                return await interaction.editReply({embeds: [new EmbedBuilder()
                    .setTitle("Online Activity | Staff")
                    .setDescription(onlineStaff.length < 1 ? "No staff are online right now! Try again later." : list)
                    .setThumbnail(client.user.avatarURL())
                    .setFooter(devsFooter(client))
                    .setColor("Random")
                    .setTimestamp()
                ]})
            }
            case "list": {
                const staff = (await getStaff()).map(sm => sm.player.name)
                return await interaction.editReply({ embeds: [staffListEmbed(client, staff)] })
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