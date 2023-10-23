import * as fn from '../../bot/utils/fn.js'

import admin from "firebase-admin"

import { EmbedBuilder, Colors, PermissionFlagsBits } from 'discord.js'
import type { Message, Client, GuildBasedChannel } from 'discord.js'

const FieldValue = admin.firestore.FieldValue
const ManageMsgs = PermissionFlagsBits.ManageMessages

export default {
  name: "unsubscribe",
  aliases: ["unsub"],
  disabled: true,
  run: async (client: Client, message: Message, args: string[]) => {
        if (!message.guild) return message.reply({embeds: [new EmbedBuilder()
            .setTitle("Error")
            .setDescription("/unsub cannot be used in a DM!")
            .setColor(Colors.Red)
            .setTimestamp()
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })]
        }).then(m => setTimeout(() => m.delete(), 10000))

        if (!message.member.permissionsIn(message.channel as GuildBasedChannel).has(ManageMsgs))
            return message.reply({embeds: [new EmbedBuilder()
                .setDescription("<:red_tick:1036290475012915270> You need either the Manage Messages permission or the Manage Channels permission to unsubscribe!")
                .setColor(Colors.Red)
                .setTimestamp()
                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                .setFooter(fn.devsFooter(client))]
            }).then(m => setTimeout(() => m.delete(), 10000))

        const channelID = message.channel.id,
            db = admin.firestore(),
            req = args.join(" ")

        const invalidUsage = new EmbedBuilder()
            .setTitle("Invalid Usage!")
            .setDescription("Usage: `/unsubscribe queue`, `/unsubscribe townless`")
            .setTimestamp()
            .setColor(Colors.Red)
            .setFooter(fn.devsFooter(client))

        if (!req) return message.reply({ embeds: [invalidUsage] })
           .then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

        if (args[0].toLowerCase() == "queue") { 
            const queueSubbedChannels = db.collection("subs").doc("queue")
            
            queueSubbedChannels.get().then(doc => {
                if (!doc.exists) return

                if (!doc.data().channelIDs.includes(channelID)) {
                    return message.reply({embeds: [new EmbedBuilder()
                        .setTitle("Unsubscription Failed")
                        .setDescription("This channel isn't subscribed to queue updates.")
                        .setColor(Colors.Red)
                        .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                } else {
                    queueSubbedChannels.update({ channelIDs: FieldValue.arrayRemove(channelID) })

                    const channelIndex = fn.queueSubbedChannelArray.indexOf(channelID)
                    fn.queueSubbedChannelArray.splice(channelIndex, 1)
                    
                    return message.reply({embeds: [new EmbedBuilder()
                        .setTitle("Unsubscription Success!")
                        .setTimestamp()
                        .setColor(Colors.Green)
                        .setDescription(`<@${message.author.id}> has successfully unsubscribed this channel from receiving queue updates.`)
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                }
            }).catch(err => console.log("Error getting document:\n", err))
        }
        else if (args[0].toLowerCase() == "townless") {
            const townlessSubbedChannels = db.collection("subs").doc("townless")

            townlessSubbedChannels.get().then(doc => {
                if (!doc.exists) return
    
                if (!doc.data().channelIDs.includes(channelID)) {
                    return message.reply({embeds: [new EmbedBuilder()
                        .setTitle("Unsubscription Failed")
                        .setDescription("This channel isn't subscribed to townless updates.")
                        .setColor(Colors.Red)
                        .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                } else {
                    townlessSubbedChannels.update({ channelIDs: FieldValue.arrayRemove(channelID) })

                    const channelIndex = fn.townlessSubbedChannelArray.indexOf(channelID)
                    fn.townlessSubbedChannelArray.splice(channelIndex, 1)

                    return message.reply({embeds: [new EmbedBuilder()
                        .setTitle("Unsubscription Success!")
                        .setTimestamp()
                        .setColor(Colors.Green)
                        .setDescription(`<@${message.author.id}> has successfully unsubscribed this channel from receiving live townless players.`)
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                }
            }).catch(e => console.log("Error getting document:", e))
        }
        else message.reply({ embeds: [invalidUsage] }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
    }
}