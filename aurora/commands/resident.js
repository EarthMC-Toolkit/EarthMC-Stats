const Discord = require("discord.js"),
      fn = require('../../bot/utils/fn'),
      { ResidentHelper } = require('../../common/resident')

module.exports = {
  name: "resident",
  description: "Displays info for a specific resident.",
  slashCommand: true,
  aliases: ["res", "player"],
  run: async (client, message, args) => {    
    const req = args.join(" "),
          m = await message.reply({embeds: [
            new Discord.MessageEmbed()
            .setTitle("<a:loading:966778243615191110> Fetching resident data, this might take a moment.")
            .setColor("DARK_PURPLE")]})
    
    if (!req) return m.edit({embeds: [
        new Discord.MessageEmbed()
        .setTitle("Invalid Arguments!")
        .setDescription("Usage: `/res playerName`")
        .setColor("RED")
        .setFooter(fn.devsFooter(client))
        .setTimestamp()
    ]}).then(m.delete({timeout: 10000})).catch(() => {})

    const resHelper = new ResidentHelper(client)
    await resHelper.init(args)

    const apiRes = resHelper.apiResident

    if (!apiRes) {
        if (!resHelper.player?.name) {
            return m.edit({embeds: [new Discord.MessageEmbed()
                .setTitle(args[0] + " isn't a registered player name, please try again.")
                .setColor("RED")
                .setFooter(fn.devsFooter(client))
                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                .setTimestamp()
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
        }

        await resHelper.setupTownlessEmbed()
    }
    else {
        // Exists, determine if townless
        if (apiRes.town) await resHelper.setupResidentEmbed()
        else await resHelper.setupTownlessEmbed()
    }

    return await m.edit({embeds: [resHelper.embed]})
  }
}