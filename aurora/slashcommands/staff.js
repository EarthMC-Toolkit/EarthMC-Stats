const Discord = require("discord.js"),
      fn = require('../../bot/utils/fn'),
      { Aurora } = require("earthmc"),
      database = require("../../bot/utils/database"),
      { SlashCommandBuilder } = require('@discordjs/builders')

async function getStaff(activeOnly) {
    const players = await database.getPlayers()
    const staffList = activeOnly ? fn.staff.active : fn.staff.all()

    return players.filter(p => staffList.find(sm => sm.toLowerCase() == p.name.toLowerCase())).map(player => { 
        const id = player?.linkedID
        return (!id || id == '') ? player.name.replace(/_/g, "\\_") : `<@${id}>`
    })
}

module.exports = {
    name: "staff",
    description: "Sends a list of current server staff",
    run: async (client, interaction) => {
        await interaction.deferReply()

        switch (interaction.options.getSubcommand().toLowerCase()) {
            case "online": {
                const ops = await Aurora.Players.online().catch(() => {})
                if (!ops) return await interaction.editReply({ 
                    embeds: [fn.fetchError],
                    ephemeral: true
                })

                const onlineStaff = fn.staff.all().filter(sm => ops.find(op => op.name.toLowerCase() == sm.toLowerCase()))
                const list = "```" + onlineStaff.join(", ").toString() + "```"

                return await interaction.editReply({embeds: [new Discord.MessageEmbed()
                    .setTitle("Online Activity | Staff")
                    .setDescription(onlineStaff.length < 1 ? "No staff are online right now! Try again later." : list)
                    .setThumbnail(client.user.avatarURL())
                    .setFooter(fn.devsFooter(client))
                    .setColor(0x556b2f)
                    .setTimestamp()
                ]})
            }
            case "list": {
                const staff = await getStaff(true)
                return await interaction.editReply({ embeds: [fn.staffListEmbed(client, staff)] })
            }
            default: return await interaction.editReply({embeds: [new Discord.MessageEmbed()
                .setTitle("Invalid Arguments!")
                .setDescription("Usage: `/staff list` or `/staff online`")
                .setColor("RED")
                .setThumbnail(client.user.avatarURL())
                .setFooter(fn.devsFooter(client))
                .setTimestamp()
            ], ephemeral: true })
        }
    }, data: new SlashCommandBuilder()
        .setName("staff")
        .setDescription("Show a list of either active or online staff.")
        .addSubcommand(subCmd => subCmd.setName('list').setDescription('List of all active staff members.'))
        .addSubcommand(subCmd => subCmd.setName('online').setDescription('List of staff currently online.'))
}