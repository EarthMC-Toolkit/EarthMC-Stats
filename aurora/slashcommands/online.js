const Discord = require('discord.js'),
      fn = require('../../bot/utils/fn'),
      emc = require("earthmc"),
      { SlashCommandBuilder } = require('@discordjs/builders')
const { CustomEmbed } = require('../../bot/objects/CustomEmbed')

module.exports = {
    name: "online",
    description: "Get online info for staff, mayors and more.",
    /**
     * @param {Discord.Client} client 
     * @param {Discord.CommandInteraction} interaction 
     */
    run: async (client, interaction) => {
        await interaction.deferReply()

        const ops = await emc.Aurora.Players.online().catch(() => {})
        if (!ops) return await interaction.editReply({embeds: [fn.fetchError], ephemeral: true})

        function displayOnlineStaff() {
            const onlineStaff = fn.staff.all().filter(sm => ops.find(op => op.name.toLowerCase() == sm.toLowerCase()))
            return interaction.editReply({embeds: [
                new Discord.MessageEmbed()
                    .setTitle("Online Activity | Staff")
                    .setDescription(onlineStaff.length >= 1 ? "```" + onlineStaff.join(", ").toString() + "```" : "No staff are online right now! Try again later.")
                    .setColor(0x556b2f)
                    .setThumbnail(client.user.avatarURL())
                    .setTimestamp()
                    .setFooter(fn.devsFooter(client))
            ]})
        }

        switch(interaction.options.getSubcommand().toLowerCase()) {
            case "all": {
                // Alphabetical sort
                ops.sort((a, b) => {
                    if (b.name.toLowerCase() < a.name.toLowerCase()) return 1
                    if (b.name.toLowerCase() > a.name.toLowerCase()) return -1

                    return 0
                })

                const allData = ops.map(op => op.name === op.nickname ? op.name : `${op.name} (${op.nickname})`)
                                   .join('\n').match(/(?:^.*$\n?){1,20}/mg)

                const botembed = [],
                      len = allData.length,
                      page = 0

                for (let i = 0; i < len; i++) {
                    botembed[i] = new Discord.MessageEmbed()
                    .setColor(0x556b2f)
                    .setTitle("Online Activity | All")
                    .setDescription("```" + allData[i] + "```")
                    .setTimestamp()
                    .setFooter({text: `Page ${i + 1}/${allData.length}`, iconURL: client.user.avatarURL()})
                }
                
                return await interaction.editReply({embeds: [botembed[page]]}).then(() => fn.paginatorInteraction(interaction, botembed, page))
            }
            case "mods":
            case "staff":
                displayOnlineStaff()
                break
            case "mayors": {
                let towns = await emc.Aurora.Towns.all().catch(() => {})
                if (!towns) return await interaction.editReply({embeds: [fn.fetchError], ephemeral: true})

                towns = towns.filter(t => ops.find(op => op.name == t.mayor)).sort((a, b) => {
                    if (a.mayor.toLowerCase() < b.mayor.toLowerCase()) return -1
                    if (a.mayor.toLowerCase() > b.mayor.toLowerCase()) return 1
                    return 0
                })
            
                const allData = towns.map(town => `${town.mayor} (${town.name})`).join('\n').match(/(?:^.*$\n?){1,20}/mg),
                    len = allData.length,
                    botembed = [],
                    page = 0

                for (let i = 0; i < len; i++) {
                    botembed[i] = new Discord.MessageEmbed()
                    .setColor(0x556b2f)
                    .setTitle("Online Activity | Mayors")
                    .setDescription("Total: " + towns.length + "```" + allData[i] + "```")
                    .setTimestamp()
                    .setFooter({text: `Page ${i+1}/${len}`, iconURL: client.user.avatarURL()})
                }
                    
                return await interaction.editReply({embeds: [botembed[page]]}).then(() => fn.paginatorInteraction(interaction, botembed, page))
            }
            case "kings": {
                const allNations = await emc.Aurora.Nations.all().catch(err => console.log(err))
                if (!allNations || allNations.length < 1) 
                    return await interaction.editReply({embeds: [fn.fetchError], ephemeral: true})

                const nations = allNations.filter(n => ops.find(op => op.name == n.king)).sort((a, b) => {
                    if (a.king.toLowerCase() < b.king.toLowerCase()) return -1
                    if (a.king.toLowerCase() > b.king.toLowerCase()) return 1
                    return 0
                })
            
                const allData = nations.map(nation => `${nation.king} (${nation.name})`).join('\n').match(/(?:^.*$\n?){1,20}/mg)
                    //   botembed = [],
                    //   page = 0
            
                return await new CustomEmbed(client, "Online Activity | Kings")
                    .paginate(allData, `Total: ${nations.length}` + "```", "```")
                    .setPage(0)
                    .setColor(0x556b2f)
                    .editInteraction(interaction)
                    
                //return await interaction.editReply({embeds: [botembed[page]]}).then(() => fn.paginatorInteraction(interaction, botembed, page))
            }
            default: return await interaction.editReply({embeds: [
                new Discord.MessageEmbed()
                    .setColor("RED")
                    .setTitle("Invalid Arguments")
                    .setDescription("Arguments: `all`, `staff`, `mayors`, `kings`")
            ], ephemeral: true})
        }
    }, data: new SlashCommandBuilder()
        .setName("online")
        .setDescription("Several commands related to online players.")
        .addSubcommand(subCmd => subCmd.setName('all').setDescription('Lists every online player.'))
        .addSubcommand(subCmd => subCmd.setName('staff').setDescription('Lists all online staff.'))
        .addSubcommand(subCmd => subCmd.setName('mayors').setDescription('Lists all online mayors.'))
        .addSubcommand(subCmd => subCmd.setName('kings').setDescription('Lists all online kings.'))
}