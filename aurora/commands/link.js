const fn = require("../../bot/utils/fn"),
      Discord = require("discord.js"),
      MC = require("../../bot/utils/minecraft"),
      linkManager = require("../../bot/utils/linking")

module.exports = {
	name: "link",
    description: "Command used to link a player's Discord to their Minecraft username.",
    slashCommand: true,
    aliases: ["unlink"],
    replyWithError: (msg, desc) => msg.reply({embeds: [new Discord.MessageEmbed()
        .setDescription(`<:red_tick:1036290475012915270> ` + desc)
        .setColor("RED")
        .setTimestamp()
    ]}).then(m => setTimeout(() => m.delete(), 10000)),
    /**
     * @param {Discord.Client} client 
     * @param {Discord.Message} message 
     */
	run: async (client, message, args) => {
        if (!fn.botDevs.includes(message.author.id)) return
        
        if (message.content.startsWith("/link")) {
            if (args.length < 2) 
                return this.replyWithError(message, "Not enough arguments! Usage: /link <username> <@mention/id>")

            const userID = message.mentions.users.first()?.id || args[1]
            if (!userID || !new RegExp(/[0-9]{18}/).test(userID)) 
                return this.replyWithError(message, "That user or ID isn't valid, please try again.")

            const name = args[0]
            const player = await MC.Players.get(name).catch(() => {})
            if (!player) return this.replyWithError(message, `${name} isn't a registered player name, please try again.`)

            const linkedPlayer = await linkManager.getLinkedPlayer(name)
            if (linkedPlayer) return this.replyWithError(message, `This username is already linked with <@${linkedPlayer.linkedID}>.`)

            await linkManager.linkPlayer(userID, player.name)
            message.reply({embeds: [new Discord.MessageEmbed()
                .setDescription(`<:green_tick:1036290473708495028> ${player.name.replace(/_/g, "\\_")} is now linked with <@${userID}>.`)
                .setColor("GREEN")
                .setTimestamp()
            ]})
        } else { // Unlink a player, the ID field isn't required
            if (args.length < 1) return this.replyWithError(message, "Not enough arguments! Usage: /unlink <username>")

            const linkedPlayer = await linkManager.getLinkedPlayer(args[0])
            if (!linkedPlayer) return this.replyWithError(message, `This username isn't linked with anyone!`)

            await linkManager.unlinkPlayer(args[0])
            message.reply({embeds: [new Discord.MessageEmbed()
                .setDescription(`<:green_tick:1036290473708495028> ${linkedPlayer.name.replace(/_/g, "\\_")} is no longer linked with <@${linkedPlayer.linkedID}>`)
                .setColor("GREEN")
                .setTimestamp()
            ]})
        }
    }
}