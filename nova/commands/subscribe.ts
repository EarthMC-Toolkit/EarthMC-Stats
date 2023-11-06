import * as fn from '../../bot/utils/fn.js'
import { EmbedBuilder, Colors, PermissionFlagsBits } from 'discord.js'
import type { Client, GuildBasedChannel, Message } from 'discord.js'

import { getFirestore } from 'firebase-admin/firestore'
import admin from 'firebase-admin'
const FieldValue = admin.firestore.FieldValue
const ManageMsgs = PermissionFlagsBits.ManageMessages

export default {
    name: "subscribe",
    description: "Subscribes a channel to receive live data.",
    aliases: ["sub"],
    run: async (client: Client, message: Message, args: string[]) => {
        if (!message.guild) return message.reply({embeds: [new EmbedBuilder()
            .setTitle("Error while using /subscribe:")
            .setDescription("You can't use `/subscribe` in a direct message!")
            .setColor(Colors.Red)
            .setTimestamp()
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
        ]})

        if (!message.member.permissionsIn(message.channel as GuildBasedChannel).has(ManageMsgs))
            return message.reply({embeds: [new EmbedBuilder()
                .setDescription("<:red_tick:1036290475012915270> You need either the Manage Messages permission or the Manage Channels permission to subscribe!")
                .setColor(Colors.Red)
                .setTimestamp()
                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                .setFooter(fn.devsFooter(client))
            ]}).then((m => setTimeout(() => m.delete(), 10000)))
        
        const channelID = message.channel.id,
              db = getFirestore()

        const subscriptionSuccess = new EmbedBuilder()
            .setTitle("Subscription Success!")
            .setTimestamp()
            .setColor(Colors.Green)
            .setFooter({ text: message.author.username, iconURL: message.author.avatarURL() })

        const invalidUsage = new EmbedBuilder()
            .setTitle("Invalid Usage!")
            .setDescription("Usage: `/subscribe queue`, `/subscribe townless`")
            .setTimestamp()
            .setColor(Colors.Red)
            .setFooter(fn.devsFooter(client))

        if (!args[0]) return message.reply({ embeds: [invalidUsage] })
            .then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

        if (args[0].toLowerCase() == "queue") {
            const queueSubbedChannels = db.collection("subs").doc("queue")

            queueSubbedChannels.get().then(async doc => {
                if (!doc.exists) return
                
                if (doc.data().channelIDs.includes(channelID)) {
                    return message.reply({embeds: [new EmbedBuilder()
                        .setTitle("Subscription Failed")
                        .setDescription("This channel is already subscribed to live queue updates.")
                        .setTimestamp()
                        .setColor(Colors.Red)
                    ]})
                }

                await message.channel.send({embeds: [new EmbedBuilder()
                    .setColor(Colors.Green)
                    .setTitle("Live Queue Count")
                    .setDescription("This message will be edited shortly with queue updates.")
                    .setTimestamp()
                ]})

                await queueSubbedChannels.update({ channelIDs: FieldValue.arrayUnion(channelID) })
                fn.queueSubbedChannelArray.push(channelID)

                subscriptionSuccess.setDescription(`<@${message.author.id}> has successfully subscribed this channel to receive queue updates.`)
                return message.reply({embeds: [subscriptionSuccess]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

            }).catch(err => console.log("Error getting document:", err))
        }
        else if (args[0].toLowerCase() == "townless") {
            const townlessSubbedChannels = db.collection("subs").doc("townless")

            townlessSubbedChannels.get().then(async function(doc) {
                if (!doc.exists) return

                if (doc.data().channelIDs.includes(channelID)) {
                    return message.reply({embeds: [new EmbedBuilder()
                        .setTitle("Subscription Failed")
                        .setDescription("This channel is already subscribed to live townless players.")
                        .setColor(Colors.Red)
                        .setTimestamp()
                    ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
                }
              
                await message.channel.send({embeds: [new EmbedBuilder()
                    .setColor(Colors.DarkPurple)
                    .setTitle("Live Townless Players")
                    .setDescription("This message will be edited shortly with townless players.")
                    .setTimestamp()
                ]})
              
                await townlessSubbedChannels.update({ channelIDs: FieldValue.arrayUnion(channelID) })
                
                fn.townlessSubbedChannelArray.push(channelID)
                subscriptionSuccess.setDescription(`<@${message.author.id}> has successfully subscribed this channel to receive live townless players.`)

                return message.reply({ embeds: [subscriptionSuccess] }).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
            }).catch(err => console.log("Error getting document:", err))
        }
        else return message.reply({embeds: [invalidUsage]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
    }
}