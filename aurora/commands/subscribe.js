const Discord = require('discord.js'),
        fn = require('../../bot/utils/fn'),
        admin = require('firebase-admin'),
        FieldValue = admin.firestore.FieldValue

module.exports = {
    name: "subscribe",
    description: "Subscribes a channel to receive live data.",
    aliases: ["sub"],
    run: async (client, message, args) => {
        if (message.channel.type == "DM") return message.reply({embeds: [
            new Discord.MessageEmbed()
            .setTitle("Error while using /subscribe:")
            .setDescription("You can't use `/subscribe` in a direct message!")
            .setColor("RED")
            .setTimestamp()
            .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
        ]})

        if (!message.member.permissionsIn(message.channel).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES))
            return message.reply({embeds: [
                new Discord.MessageEmbed()
                .setDescription("<:red_tick:1036290475012915270> You need either the Manage Messages permission or the Manage Channels permission to subscribe!")
                .setColor("RED")
                .setTimestamp()
                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                .setFooter(fn.devsFooter(client))
            ]}).then((m => setTimeout(() => m.delete(), 10000)))
        
        const channelID = message.channel.id,
            db = admin.firestore()

        var subscriptionSuccess = new Discord.MessageEmbed()
            .setTitle("Subscription Success!")
            .setTimestamp()
            .setColor("GREEN")
            .setFooter({text: message.author.username, iconURL: message.author.avatarURL()})

        var invalidUsage = new Discord.MessageEmbed()
            .setTitle("Invalid Usage!")
            .setDescription("Usage: `/subscribe queue`, `/subscribe townless`")
            .setTimestamp()
            .setColor("RED")
            .setFooter(fn.devsFooter(client))

        if (!args[0]) return message.reply({embeds: [invalidUsage]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

        if (args[0].toLowerCase() == "queue") {
            var queueSubbedChannels = db.collection("subs").doc("queue")

            queueSubbedChannels.get().then(async doc => {
                if (!doc.exists) return
                
                if (doc.data().channelIDs.includes(channelID)) return message.reply({embeds: [
                    new Discord.MessageEmbed()
                    .setTitle("Subscription Failed")
                    .setDescription("This channel is already subscribed to live queue updates.")
                    .setTimestamp()
                    .setColor("RED")
                ]})

                queueSubbedChannels.update({ channelIDs: FieldValue.arrayUnion(channelID) })
                fn.queueSubbedChannelArray.push(channelID)

                message.channel.send({embeds: [
                    new Discord.MessageEmbed()
                    .setColor("GREEN")
                    .setTitle("Live Queue Count")
                    .setDescription("This message will be edited shortly with queue updates.")
                    .setTimestamp()
                ]})

                subscriptionSuccess.setDescription(`<@${message.author.id}> has successfully subscribed this channel to receive queue updates.`)
                return message.reply({embeds: [subscriptionSuccess]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

            }).catch(err => console.log("Error getting document:", err))
        }
        else if (args[0].toLowerCase() == "townless") {
            var townlessSubbedChannels = db.collection("subs").doc("townless")

            townlessSubbedChannels.get().then(async doc => {
                if (!doc.exists) return

                if (doc.data().channelIDs.includes(channelID))
                    return message.reply({embeds: [
                        new Discord.MessageEmbed()
                        .setTitle("Subscription Failed")
                        .setDescription("This channel is already subscribed to live townless players.")
                        .setColor("RED")
                        .setTimestamp()
                    ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
              
                message.channel.send({embeds: [
                    new Discord.MessageEmbed()
                    .setColor("DARK_PURPLE")
                    .setTitle("Live Townless Players")
                    .setDescription("This message will be edited shortly with townless players.")
                    .setTimestamp()
                ]})
              
                townlessSubbedChannels.update({ channelIDs: FieldValue.arrayUnion(channelID) })
                fn.townlessSubbedChannelArray.push(channelID)

                subscriptionSuccess.setDescription(`<@${message.author.id}> has successfully subscribed this channel to receive live townless players.`)
                return message.reply({embeds: [subscriptionSuccess]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
            }).catch(err => console.log("Error getting document:", err))
        }
        else return message.reply({embeds: [invalidUsage]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
    }
}