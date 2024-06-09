import {
    type Client,
    type ChatInputCommandInteraction,
    Colors, EmbedBuilder, SlashCommandBuilder
} from "discord.js"

import { Aurora } from "earthmc"
import * as fn from '../../bot/utils/fn.js'
import * as database from "../../bot/utils/database.js"

const getStaff = async(activeOnly: boolean) => {
    const players = await database.getPlayers()
    const staffList = activeOnly ? fn.staff.active : fn.staff.all()

    return players.filter(p => staffList.find(sm => sm.toLowerCase() == p.name.toLowerCase())).map(player => { 
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
                    embeds: [fn.fetchError],
                    //ephemeral: true
                })

                const onlineStaff = fn.staff.all().filter(sm => ops.find(op => op.name.toLowerCase() == sm.toLowerCase()))
                const list = "```" + onlineStaff.join(", ").toString() + "```"

                return await interaction.reply({embeds: [new EmbedBuilder()
                    .setTitle("Online Activity | Staff")
                    .setDescription(onlineStaff.length < 1 ? "No staff are online right now! Try again later." : list)
                    .setThumbnail(client.user.avatarURL())
                    .setFooter(fn.devsFooter(client))
                    .setColor("Random")
                    .setTimestamp()
                ]})
            }
            case "list": {
                const staff = await getStaff(true)
                return await interaction.reply({ embeds: [fn.staffListEmbed(client, staff)] })
            }
            default: return await interaction.reply({ embeds: [new EmbedBuilder()
                .setTitle("Invalid Arguments!")
                .setDescription("Usage: `/staff list` or `/staff online`")
                .setColor(Colors.Red)
                .setThumbnail(client.user.avatarURL())
                .setFooter(fn.devsFooter(client))
                .setTimestamp()
            ]})
        }
    }, data: new SlashCommandBuilder()
        .setName("staff")
        .setDescription("Show a list of either active or online staff.")
        .addSubcommand(subCmd => subCmd.setName('list').setDescription('List of all active staff members.'))
        .addSubcommand(subCmd => subCmd.setName('online').setDescription('List of staff currently online.'))
}