import { 
    getLinkedPlayer, 
    unlinkPlayer, 
    linkPlayer 
} from "../../bot/utils/linking.js"

import { botDevs } from "../../bot/utils/fn.js"
import * as MC from "../../bot/utils/minecraft.js"

import {
    type Client, 
    type Message,
    Colors, EmbedBuilder
} from "discord.js"

const replyWithError = (msg: Message, desc: string) => msg.reply({embeds: [new EmbedBuilder()
    .setDescription(`<:red_tick:1036290475012915270> ${desc}`)
    .setColor(Colors.Red)
    .setTimestamp()
]}).then(m => setTimeout(() => m.delete(), 10000))

export default {
	name: "link",
    description: "Command used to link a player's Discord to their Minecraft username.",
    slashCommand: true,
    aliases: ["unlink"],
	run: async (_: Client, message: Message, args: string[]) => {
        if (!botDevs.includes(message.author.id)) return
        
        const argsLen = args.length
        const { content, mentions } = message
        const name = args[0]

        if (content.startsWith("/link")) {
            if (argsLen < 2) return replyWithError(message, "Not enough arguments! Usage: /link <username> <@mention/id>")

            const userID = mentions.users.first()?.id || args[1]
            if (!userID || !new RegExp(/[0-9]{18}/).test(userID)) 
                return replyWithError(message, "That user or ID isn't valid, please try again.")

            const player = await MC.Players.get(name).catch(() => {})
            if (!player) return replyWithError(message, `${name} isn't a registered player name, please try again.`)

            const linkedPlayer = await getLinkedPlayer(name)
            if (linkedPlayer) return replyWithError(message, `This username is already linked with <@${linkedPlayer.linkedID}>.`)

            await linkPlayer(userID, player.name)
            return message.reply({embeds: [new EmbedBuilder()
                .setDescription(`<:green_tick:1036290473708495028> ${player.name.replace(/_/g, "\\_")} is now linked with <@${userID}>.`)
                .setColor(Colors.Green)
                .setTimestamp()
            ]})
        }

        // Unlink a player, the ID field isn't required
        if (argsLen < 1) return replyWithError(message, "Not enough arguments! Usage: /unlink <username>")

        const linkedPlayer = await getLinkedPlayer(name)
        if (!linkedPlayer) return replyWithError(message, `This username isn't linked with anyone!`)

        await unlinkPlayer(name)
        message.reply({embeds: [new EmbedBuilder()
            .setDescription(`<:green_tick:1036290473708495028> ${linkedPlayer.name.replace(/_/g, "\\_")} is no longer linked with <@${linkedPlayer.linkedID}>`)
            .setColor(Colors.Green)
            .setTimestamp()
        ]})
    }
}