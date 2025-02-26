import {
    type Client,
    type ChatInputCommandInteraction,
    Colors, EmbedBuilder, SlashCommandBuilder
} from "discord.js"

import { Aurora } from "earthmc"

import { 
    devsFooter, fetchError, 
    staff, staffListEmbed 
} from '../../bot/utils/fn.js'

import * as database from "../../bot/utils/database.js"

const getStaff = async(activeOnly: boolean) => {
    const players = await database.getPlayers()
    const staffList = activeOnly ? staff.active : staff.all()

    const staffPlayers = players.filter(p => staffList.some(sm => sm.toLowerCase() == p.name.toLowerCase()))
    return staffPlayers.map(player => {
        const id = player?.linkedID
        return (!id || id == '') ? player.name.replace(/_/g, "\\_") : `<@${id}>`
    })
}

export default {
    name: "staff",
    description: "Sends a list of current server staff",
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        //await interaction.deferReply()

        switch (interaction.options.getSubcommand().toLowerCase()) {
            case "online": {
                const ops = await Aurora.Players.online().catch(() => {})
                if (!ops) return await interaction.reply({ 
                    embeds: [fetchError]
                    //ephemeral: true
                })

                const onlineStaff = staff.all().filter(sm => ops.some(op => op.name.toLowerCase() == sm.toLowerCase()))
                const list = "```" + onlineStaff.join(", ").toString() + "```"

                return await interaction.reply({embeds: [new EmbedBuilder()
                    .setTitle("Online Activity | Staff")
                    .setDescription(onlineStaff.length < 1 ? "No staff are online right now! Try again later." : list)
                    .setThumbnail(client.user.avatarURL())
                    .setFooter(devsFooter(client))
                    .setColor("Random")
                    .setTimestamp()
                ]})
            }
            case "list": {
                const staff = await getStaff(true)
                return await interaction.reply({ embeds: [staffListEmbed(client, staff)] })
            }
            default: return await interaction.reply({ embeds: [new EmbedBuilder()
                .setTitle("Invalid Arguments!")
                .setDescription("Usage: `/staff list` or `/staff online`")
                .setColor(Colors.Red)
                .setThumbnail(client.user.avatarURL())
                .setFooter(devsFooter(client))
                .setTimestamp()
            ]})
        }
    }, data: new SlashCommandBuilder()
        .setName("staff")
        .setDescription("Show a list of either active or online staff.")
        .addSubcommand(subCmd => subCmd.setName('list').setDescription('List of all active staff members.'))
        .addSubcommand(subCmd => subCmd.setName('online').setDescription('List of staff currently online.'))
}