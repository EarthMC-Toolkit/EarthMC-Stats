import * as fn from '../../bot/utils/fn.js'

import admin from 'firebase-admin'
import {
    type Client, 
    type Message, 
    EmbedBuilder, Colors, 
    PermissionFlagsBits, ChannelType,
} from "discord.js"

const FieldValue = admin.firestore.FieldValue
const ManageMsgs = PermissionFlagsBits.ManageMessages

export default {
    name: "subscribe",
    description: "Subscribes a channel to receive live data.",
    aliases: ["sub"],
    run: async (client: Client, message: Message, args: string[]) => {
        if (message.channel.type == ChannelType.DM) return message.reply({embeds: [new EmbedBuilder()
            .setTitle("Error while using /subscribe:")
            .setDescription("You can't use `/subscribe` in a direct message!")
            .setColor(Colors.Red)
            .setTimestamp()
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })]
        })

        if (!message.member.permissionsIn(message.channel).has(ManageMsgs)) {
            return message.reply({embeds: [new EmbedBuilder()
                .setDescription("<:red_tick:1036290475012915270> You need either the Manage Messages permission or the Manage Channels permission to subscribe!")
                .setColor(Colors.Red)
                .setTimestamp()
                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                .setFooter(fn.devsFooter(client))
            ]}).then((m => setTimeout(() => m.delete(), 10000)))
        }
        
        const channelID = message.channel.id
        const db = admin.firestore()

        const subscriptionSuccess = new EmbedBuilder()
            .setTitle("Subscription Success!")
            .setTimestamp()
            .setColor(Colors.Green)
            .setFooter({text: message.author.username, iconURL: message.author.avatarURL()})

        const invalidUsage = new EmbedBuilder()
            .setTitle("Invalid Usage!")
            .setDescription("Usage: `/subscribe queue`, `/subscribe townless`")
            .setTimestamp()
            .setColor(Colors.Red)
            .setFooter(fn.devsFooter(client))

        const arg0 = args[0]?.toLowerCase()
        if (!arg0) return message.reply({ embeds: [invalidUsage] })
            .then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

        if (arg0 == "queue") {
            try {
                const queueSubbedChannels = db.collection("subs").doc("queue")
                const doc = await queueSubbedChannels.get()
                if (!doc.exists) return
                
                const ids = doc.data().channelIDs
                if (ids.includes(channelID)) return message.reply({embeds: [new EmbedBuilder()
                    .setTitle("Subscription Failed")
                    .setDescription("This channel is already subscribed to live queue updates.")
                    .setTimestamp()
                    .setColor(Colors.Red)
                ]})

                queueSubbedChannels.update({ channelIDs: FieldValue.arrayUnion(channelID) })
                fn.queueSubbedChannelArray.push(channelID)

                message.channel.send({embeds: [new EmbedBuilder()
                    .setColor(Colors.Green)
                    .setTitle("Live Queue Count")
                    .setDescription("This message will be edited shortly with queue updates.")
                    .setTimestamp()
                ]})

                subscriptionSuccess.setDescription(`<@${message.author.id}> has successfully subscribed this channel to receive queue updates.`)
                return message.reply({ embeds: [subscriptionSuccess] }).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
            } catch(err) {
                console.log("Error getting document:", err)
            }
        }
        
        if (arg0 == "townless") {
            try {
                const townlessSubbedChannels = db.collection("subs").doc("townless")
                const doc = await townlessSubbedChannels.get()
                if (!doc.exists) return

                const ids = doc.data().channelIDs
                if (ids.includes(channelID)) return message.reply({embeds: [new EmbedBuilder()
                    .setTitle("Subscription Failed")
                    .setDescription("This channel is already subscribed to live townless players.")
                    .setColor(Colors.Red)
                    .setTimestamp()
                ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
              
                message.channel.send({embeds: [new EmbedBuilder()
                    .setColor(Colors.DarkPurple)
                    .setTitle("Live Townless Players")
                    .setDescription("This message will be edited shortly with townless players.")
                    .setTimestamp()
                ]})
              
                townlessSubbedChannels.update({ channelIDs: FieldValue.arrayUnion(channelID) })
                fn.townlessSubbedChannelArray.push(channelID)

                subscriptionSuccess.setDescription(`<@${message.author.id}> has successfully subscribed this channel to receive live townless players.`)
                return message.reply({embeds: [subscriptionSuccess]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
            } catch (err) {
                console.log("Error getting document:", err)
            }
        }

        return message.reply({ embeds: [invalidUsage] })
            .then((m => setTimeout(() => m.delete(), 10000)))
            .catch(() => {})
    }
}