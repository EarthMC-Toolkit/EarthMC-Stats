const Discord = require("discord.js"),
      fn = require('../../bot/utils/fn'),
      emc = require("earthmc"),
      database = require("../../bot/utils/database"),
      { SlashCommandBuilder } = require('@discordjs/builders'),
      linking = require("../../bot/utils/linking")

module.exports = {
    name: "nationset",
    run: async (client, interaction) => {
        await interaction.deferReply()

        const mapDB = interaction.options.getString("map").toLowerCase() == "nova" ? database.Nova : database.Aurora
        const nations = (await mapDB.getNations()).map(n => {
            n.name = emc.formatString(n.name, true)
            return n
        })

        const nationName = interaction.options.getString("name").toLowerCase(),
              nationIndex = nations.findIndex(n => n.name.toLowerCase() == nationName)

        const nation = nations.find(n => n.name.toLowerCase() == nationName)
        let save = false

        if (!nation) return interaction.editReply({embeds: [new Discord.MessageEmbed()
            .setDescription(`${nationName} is not a registered nation, please try again.`)
            .setColor("RED")
            .setTimestamp()]
        }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

        const userID = interaction.user.id,
              linkedPlayer = await linking.getLinkedPlayer(userID)

        if (!linkedPlayer || (nation.king.toLowerCase() != linkedPlayer.name.toLowerCase() && !fn.botDevs.includes(userID)))
            return interaction.editReply({embeds: [
                new Discord.MessageEmbed()
                .setDescription("You must be linked and be the owner of this nation in order to edit it.")
                .setColor("RED")
                .setTimestamp()
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

        const value = interaction.options.getString("value")
        const cleared = value.toLowerCase() == "none" || value.toLowerCase() == "clear"

        switch (interaction.options.getString("type").toLowerCase()) {
            case "prefix": {
                if (cleared) nation.kingPrefix = ""
                else nation.kingPrefix = value.substring(0, 10)

                const embed = new Discord.MessageEmbed()
                    .setTitle("Nation Updated | " + nation.name)
                    .setDescription(`The king prefix has been ${cleared ? "cleared" : "set to `" + value.substring(0, 10) + "`"}.`)
                    .setColor("AQUA")
                    .setTimestamp()

                await interaction.editReply({embeds: [embed]})

                embed.setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                     .addFields({ name: "Username", value: linkedPlayer.name, inline: true },
                                { name: "ID", value: linkedPlayer.linkedID, inline: true })
                //await client.channels.cache.get("903771461746044949")?.send({embeds: [embed]})

                save = true
                break
            }
            case "discord": {
                if (cleared) nation.discord = ""
                else {
                    const inviteRegex = new RegExp(/discord(?:\.com|app\.com|\.gg)[\/invite\/]?(?:[a-zA-Z0-9\-]{2,32})/)
                    if (!inviteRegex.test(value)) {
                        return interaction.editReply({embeds: [
                            new Discord.MessageEmbed()
                            .setDescription(`${value} is not a valid discord invite, please try again.`)
                            .setColor("RED")
                            .setTimestamp()
                        ]})
                    }

                    nation.discord = value
                }

                const embed = new Discord.MessageEmbed()
                    .setTitle("Nation Updated | " + nation.name)
                    .setDescription(`The nation's discord invite has been ${cleared ? "cleared" : "set to `" + value + "`"}.`) 
                    .setColor("AQUA")
                    .setTimestamp()

                await interaction.editReply({embeds: [embed]})

                embed.setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                     .addFields({ name: "Username", value: linkedPlayer.name, inline: true },
                                { name: "ID", value: linkedPlayer.linkedID, inline: true })
                //await client.channels.cache.get("903771461746044949")?.send({embeds: [embed]})

                save = true
                break
            }
            case "flag": {
                if (cleared) nation.flag = ""
                else {
                    const imageRegex = new RegExp("(https?://.*.(?:png|jpg|jpeg))")
                    if (!imageRegex.test(value)) return interaction.editReply({embeds: [
                        new Discord.MessageEmbed()
                            .setDescription(`${value} is not a valid image link, please try again.`)
                            .setColor("RED")
                            .setTimestamp()
                    ]})
                    
                    nation.flag = value
                }

                const embed = new Discord.MessageEmbed()
                    .setTitle("Nation Updated | " + nation.name)
                    .setDescription(`The nation's flag has been ${cleared ? "cleared." : "changed to:"}`)
                    .setColor("AQUA")
                    .setTimestamp()
                
                if (!cleared) embed.setThumbnail(value)
                await interaction.editReply({embeds: [embed]})

                embed.setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                     .addFields({ name: "Username", value: linkedPlayer.name, inline: true },
                                { name: "ID", value: linkedPlayer.linkedID, inline: true })
                //await client.channels.cache.get("903771461746044949")?.send({embeds: [embed]})

                save = true
                break
            }
            default: {
                interaction.editReply({embeds: [new Discord.MessageEmbed()
                    .setDescription("<:red_tick:1036290475012915270> Invalid arguments! Options: Prefix, Discord or Flag")
                    .setColor("RED")
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

                break
            }
        }

        if (save) {
            nations[nationIndex] = nation
            mapDB.setNations(nations)
        }
    }, data: new SlashCommandBuilder().setName("nationset")
        .setDescription("Sets nation data for a specific nation, can only be used by the nation leader.")
        .addStringOption(option => option.setName("map").setDescription("Name of the map this nation is in, defaults to Aurora.").setRequired(true))
        .addStringOption(option => option.setName("name").setDescription("The name of your nation.").setRequired(true))
        .addStringOption(option => option.setName("type").setDescription("The type of data to set.").setRequired(true)
            .addChoices({ name: "King Prefix", value: "prefix" }, 
                        { name: "Discord Invite", value: "discord" },
                        { name: "Flag", value: "flag" })
        ).addStringOption(option => option.setName("value").setDescription("The value of the type specified.").setRequired(true))
}