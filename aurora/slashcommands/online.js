const Discord = require('discord.js'),
      fn = require('../../bot/utils/fn'),
      emc = require("earthmc"),
      { SlashCommandBuilder } = require('@discordjs/builders')

module.exports = {
    name: "online",
    description: "Get online info for staff, mayors and more.",
    /**
     * @param {Discord.Client} client 
     * @param {Discord.CommandInteraction} interaction 
     */
    run: async (client, interaction) => {
        await interaction.deferReply()

        const onlinePlayers = await emc.Aurora.Players.online().catch(() => {})
        if (!onlinePlayers) return await interaction.editReply({embeds: [fn.fetchError], ephemeral: true})

        function displayOnlineStaff() {
            const onlineStaff = fn.staff.all().filter(sm => onlinePlayers.find(op => op.name.toLowerCase() == sm.toLowerCase()))
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
                onlinePlayers.sort((a, b) => {
                    if (b.name.toLowerCase() < a.name.toLowerCase()) return 1
                    if (b.name.toLowerCase() > a.name.toLowerCase()) return -1

                    return 0
                })

                const allData = onlinePlayers
                    .map(op => op.name === op.nickname ? op.name : `${op.name} (${op.nickname})`)
                    .join('\n').match(/(?:^.*$\n?){1,20}/mg)

                const botembed = [],
                      len = allData.length

                const page = 0
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

                towns = towns.filter(t => onlinePlayers.find(op => op.name == t.mayor)).sort((a, b) => {
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
                let nations = await emc.Aurora.Nations.all().catch(err => console.log(err))
                if (!nations || nations.length < 1) 
                    return await interaction.editReply({embeds: [fn.fetchError], ephemeral: true})

                nations = nations.filter(n => onlinePlayers.find(op => op.name == n.king))
                //console.log("\n\nFILTERED: " + nations)

                nations.sort((a, b) => {
                    if (a.king.toLowerCase() < b.king.toLowerCase()) return -1
                    if (a.king.toLowerCase() > b.king.toLowerCase()) return 1
                    return 0
                })
            
                const page = 0, 
                      allData = nations.map(nation => `${nation.king} (${nation.name})`).join('\n').match(/(?:^.*$\n?){1,20}/mg),
                      botembed = [], len = allData.length
            
                for (let i = 0; i < len; i++) {
                    botembed[i] = new Discord.MessageEmbed()
                    .setColor(0x556b2f)
                    .setTitle("Online Activity | Kings")
                    .setDescription("Total: " + nations.length + "```" + allData[i] + "```")
                    .setTimestamp()
                    .setFooter({text: `Page ${i + 1}/${len}`, iconURL: client.user.avatarURL()})
                }
                    
                return await interaction.editReply({embeds: [botembed[page]]}).then(() => fn.paginatorInteraction(interaction, botembed, page))
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