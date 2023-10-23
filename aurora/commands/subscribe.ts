import Discord from 'discord.js'
import * as fn from '../../bot/utils/fn.js'

import admin from 'firebase-admin'

const FieldValue = admin.firestore.FieldValue
const ManageMsgs = Discord.PermissionFlagsBits.ManageMessages

export default {
    name: "subscribe",
    description: "Subscribes a channel to receive live data.",
    aliases: ["sub"],
    run: async (client: Discord.Client, message: Discord.Message, args: string[]) => {
        if (message.channel.type == Discord.ChannelType.DM) return message.reply({embeds: [
            new Discord.EmbedBuilder()
            .setTitle("Error while using /subscribe:")
            .setDescription("You can't use `/subscribe` in a direct message!")
            .setColor(Discord.Colors.Red)
            .setTimestamp()
            .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
        ]})

        if (!message.member.permissionsIn(message.channel).has(ManageMsgs)) {
            return message.reply({embeds: [
                new Discord.EmbedBuilder()
                .setDescription("<:red_tick:1036290475012915270> You need either the Manage Messages permission or the Manage Channels permission to subscribe!")
                .setColor(Discord.Colors.Red)
                .setTimestamp()
                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                .setFooter(fn.devsFooter(client))
            ]}).then((m => setTimeout(() => m.delete(), 10000)))
        }
        
        const channelID = message.channel.id,
              db = admin.firestore()

        const subscriptionSuccess = new Discord.EmbedBuilder()
            .setTitle("Subscription Success!")
            .setTimestamp()
            .setColor(Discord.Colors.Green)
            .setFooter({text: message.author.username, iconURL: message.author.avatarURL()})

        const invalidUsage = new Discord.EmbedBuilder()
            .setTitle("Invalid Usage!")
            .setDescription("Usage: `/subscribe queue`, `/subscribe townless`")
            .setTimestamp()
            .setColor(Discord.Colors.Red)
            .setFooter(fn.devsFooter(client))

        const arg0 = args[0]?.toLowerCase()
        if (!arg0) return message.reply({embeds: [invalidUsage]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

        if (arg0 == "queue") {
            try {
                const queueSubbedChannels = db.collection("subs").doc("queue")
                const doc = await queueSubbedChannels.get()
                if (!doc.exists) return
                
                if (doc.data().channelIDs.includes(channelID)) return message.reply({embeds: [
                    new Discord.EmbedBuilder()
                    .setTitle("Subscription Failed")
                    .setDescription("This channel is already subscribed to live queue updates.")
                    .setTimestamp()
                    .setColor(Discord.Colors.Red)
                ]})

                queueSubbedChannels.update({ channelIDs: FieldValue.arrayUnion(channelID) })
                fn.queueSubbedChannelArray.push(channelID)

                message.channel.send({embeds: [
                    new Discord.EmbedBuilder()
                    .setColor(Discord.Colors.Green)
                    .setTitle("Live Queue Count")
                    .setDescription("This message will be edited shortly with queue updates.")
                    .setTimestamp()
                ]})

                subscriptionSuccess.setDescription(`<@${message.author.id}> has successfully subscribed this channel to receive queue updates.`)
                return message.reply({embeds: [subscriptionSuccess]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
            } catch(err) {
                console.log("Error getting document:", err)
            }
        }
        else if (arg0 == "townless") {
            try {
                const townlessSubbedChannels = db.collection("subs").doc("townless")
                const doc = await townlessSubbedChannels.get()
                if (!doc.exists) return

                if (doc.data().channelIDs.includes(channelID)) {
                    return message.reply({embeds: [
                        new Discord.EmbedBuilder()
                        .setTitle("Subscription Failed")
                        .setDescription("This channel is already subscribed to live townless players.")
                        .setColor(Discord.Colors.Red)
                        .setTimestamp()
                    ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
                }
              
                message.channel.send({embeds: [
                    new Discord.EmbedBuilder()
                    .setColor(Discord.Colors.DarkPurple)
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
        else return message.reply({embeds: [invalidUsage]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
    }
}