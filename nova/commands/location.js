const Discord = require('discord.js'),
      fn = require('../../bot/utils/fn.js')

module.exports = {
    name: "location",
    aliases: ["loc"],
    run: async (client, message, args) => {
        var xcoord = args[0],
            zcoord = args[1],
            zoom = args[2]
      
        if (!xcoord || !zcoord || isNaN(xcoord) || isNaN(zcoord)) {
            return message.reply({embeds: [
                new Discord.MessageEmbed()
                .setTitle("Error while using /location:")
                .setDescription("Invalid arguments!\n\nUsage: `n/loc xcoord zcoord`")
                .setTimestamp()
                .setFooter(fn.devsFooter(client))
                .setColor("RED")
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
        } else if (Number(xcoord) >= 33081 || Number(xcoord) < -33280 || Number(zcoord) >= 16508 || Number(zcoord) < -16640) {
            return message.reply({embeds: [
                new Discord.MessageEmbed()
                .setTitle("Error while using /location:")
                .setColor("RED")
                .setDescription("Please enter 2 values that are inside EarthMC's world border.")
                .setTimestamp()
                .setFooter(fn.devsFooter(client))
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
        }
        else {
            if (zoom != null) {
                if (!isNaN(zoom) && Number(zoom) < 11) {
                    return message.reply({embeds: [
                        new Discord.MessageEmbed()
                        .setTitle("(Nova) Map location for X:" + xcoord + ", Z:" + zcoord)
                        .addField("Dynmap Link", "[Click here](https://earthmc.net/map/nova/?worldname=earth&mapname=flat&zoom=" + zoom + "&x=" + xcoord + "&y=64&z=" + zcoord + ")")
                        .addField("Zoom", zoom.toString())
                        .setTimestamp()
                        .setFooter(fn.devsFooter(client))
                        .setColor("GREEN")
                    ]})
                } else {
                    return message.reply({embeds: [
                        new Discord.MessageEmbed()
                        .setTitle("Error while using /location:")
                        .setColor("RED")
                        .setDescription("`" + zoom + "`" + " is not a valid zoom! Please use a number from 1-10.")
                        .setTimestamp()
                        .setFooter(fn.devsFooter(client))
                    ]}).then(msg => setTimeout(() => msg.delete(), 10000)).catch(() => {})
                }
            } else {              
                return message.reply({embeds: [
                    new Discord.MessageEmbed()
                    .setTitle("(Nova) Map location for X: " + xcoord + ", Z: " + zcoord + "")
                    .addField("Dynmap Link", "[Click here](https://earthmc.net/map/nova/?worldname=earth&mapname=flat&zoom=4&x=" + xcoord + "&y=64&z=" + zcoord + ")")
                    .setTimestamp()
                    .setFooter(fn.devsFooter(client))
                    .setColor("GREEN")
                ]})
            }
        }
  }
}