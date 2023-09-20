const Discord = require("discord.js"),
      fn = require('../../bot/utils/fn'),
      { ResidentHelper } = require('../../common/resident')

module.exports = {
    name: "resident",
    description: "Displays info for a specific resident.",
    aliases: ["res", "player"],
    run: async (client, message, args) => {
        const req = args.join(" ")
        const m = await message.reply({embeds: [
            new Discord.MessageEmbed()
                .setTitle("<a:loading:966778243615191110> Fetching resident data, this might take a moment.")
                .setColor("DARK_PURPLE")
        ]})
 
        if (!req) return m.edit({embeds: [
            new Discord.MessageEmbed()
            .setTitle("Invalid Arguments!")
            .setDescription("Usage: `/res playerName`")
            .setColor("RED")
            .setFooter(fn.devsFooter(client))
            .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
            .setTimestamp()
        ]}).then(m.delete({timeout: 10000})).catch(() => {})

        const resHelper = new ResidentHelper(client, true)
        await resHelper.init(args)

        // Townless
        if (!resHelper.dbResident) {  
            if (!resHelper.player?.name) {
                return m.edit({embeds: [new Discord.MessageEmbed()
                    .setTitle(args[0] + " isn't a registered player name, please try again.")
                    .setColor("RED")
                    .setFooter(fn.devsFooter(client))
                    .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                    .setTimestamp()
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
            }

            await resHelper.setupTownlessEmbed()
        }
        else { // Belongs to a town
            await resHelper.setupResidentEmbed()
        }

        return await m.edit({embeds: [resHelper.embed]})
    }
}