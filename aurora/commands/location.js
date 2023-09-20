const Discord = require('discord.js'),
      fn = require('../../bot/utils/fn.js')

module.exports = {
    name: "location",
    aliases: ["loc"],
    slashCommand: true,
    run: async (client, message, args) => {
        const xcoord = args[0],
              zcoord = args[1],
              zoom = args[2]

        const embed = (title, colour) => new Discord.MessageEmbed()
            .setTitle(title)
            .setColor(colour)
            .setFooter(fn.devsFooter(client))
            .setTimestamp()

        const inWorldBorder = (x, z) =>
            Number(x) >= 33081 || Number(x) < -33280 || 
            Number(z) >= 16508 || Number(z) < -16640

        if (!xcoord || !zcoord || isNaN(xcoord) || isNaN(zcoord)) return message.reply({embeds: [
            embed("Error while using /location:", "RED")
            .setDescription("Invalid arguments!\n\nUsage: `/loc xcoord zcoord`")
        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
        else if (inWorldBorder(xcoord, zcoord)) return message.reply({embeds: [
            embed("Error while using /location:", "RED")
            .setDescription("Please enter 2 values that are inside EarthMC's world border.")
        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
        else {
            if (!zoom) return message.reply({embeds: [
                embed("(Aurora) Map location for X:" + xcoord + ", Z:" + zcoord, "GREEN")
                .addField("Dynmap Link", "[Click here](https://earthmc.net/map/aurora/?worldname=earth&mapname=flat&zoom=4&x=" + xcoord + "&y=64&z=" + zcoord + ")")
            ]})

            if (!isNaN(zoom) && Number(zoom) < 11) 
                return message.reply({embeds: [
                    embed("(Aurora) Map location for X:" + xcoord + ", Z:" + zcoord, "GREEN")
                    .addField("Dynmap Link", "[Click here](https://earthmc.net/map/aurora/?worldname=earth&mapname=flat&zoom=" + zoom + "&x=" + xcoord + "&y=64&z=" + zcoord + ")")
                    .addField("Zoom", zoom.toString())
                ]})
        
            return message.reply({embeds: [
                embed("Error while using /location:", "RED")
                .setDescription("`" + zoom + "`" + " is not a valid zoom! Please use a number from 1-10.")
            ]}).then(msg => setTimeout(() => msg.delete(), 10000)).catch(() => {})
        }
    }
}