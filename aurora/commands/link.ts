import { 
    getLinkedPlayer, 
    unlinkPlayer, 
    linkPlayer 
} from "../../bot/utils/linking.js"

import * as fn from "../../bot/utils/fn.js"
import * as MC from "../../bot/utils/minecraft.js"

import Discord from "discord.js"

const replyWithError = (msg: Discord.Message, desc: string) => msg.reply({embeds: [new Discord.EmbedBuilder()
    .setDescription(`<:red_tick:1036290475012915270> ${desc}`)
    .setColor(Discord.Colors.Red)
    .setTimestamp()
]}).then(m => setTimeout(() => m.delete(), 10000))

export default {
	name: "link",
    description: "Command used to link a player's Discord to their Minecraft username.",
    slashCommand: true,
    aliases: ["unlink"],
	run: async (_: Discord.Client, message: Discord.Message, args: string[]) => {
        if (!fn.botDevs.includes(message.author.id)) return
        
        const argsLen = args.length
        const { content, mentions } = message

        if (content.startsWith("/link")) {
            if (argsLen < 2) return replyWithError(message, "Not enough arguments! Usage: /link <username> <@mention/id>")

            const userID = mentions.users.first()?.id || args[1]
            if (!userID || !new RegExp(/[0-9]{18}/).test(userID)) 
                return replyWithError(message, "That user or ID isn't valid, please try again.")

            const name = args[0]
            const player = await MC.Players.get(name).catch(() => {})
            if (!player) return replyWithError(message, `${name} isn't a registered player name, please try again.`)

            const linkedPlayer = await getLinkedPlayer(name)
            if (linkedPlayer) return replyWithError(message, `This username is already linked with <@${linkedPlayer.linkedID}>.`)

            await linkPlayer(userID, player.name)
            message.reply({embeds: [new Discord.EmbedBuilder()
                .setDescription(`<:green_tick:1036290473708495028> ${player.name.replace(/_/g, "\\_")} is now linked with <@${userID}>.`)
                .setColor(Discord.Colors.Green)
                .setTimestamp()
            ]})
        } else { // Unlink a player, the ID field isn't required
            if (argsLen < 1) return replyWithError(message, "Not enough arguments! Usage: /unlink <username>")

            const name = args[0]
            const linkedPlayer = await getLinkedPlayer(name)
            if (!linkedPlayer) return replyWithError(message, `This username isn't linked with anyone!`)

            await unlinkPlayer(name)
            message.reply({embeds: [new Discord.EmbedBuilder()
                .setDescription(`<:green_tick:1036290473708495028> ${linkedPlayer.name.replace(/_/g, "\\_")} is no longer linked with <@${linkedPlayer.linkedID}>`)
                .setColor(Discord.Colors.Green)
                .setTimestamp()
            ]})
        }
    }
}