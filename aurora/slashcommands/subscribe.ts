import Discord from 'discord.js'

import * as fn from '../../bot/utils/fn.js'

import admin from 'firebase-admin'
const FieldValue = admin.firestore.FieldValue
const ManageMsgs = Discord.PermissionsBitField.Flags.ManageMessages

const subscriptionSuccess = new Discord.EmbedBuilder()
    .setTitle("Subscription Success!")
    .setTimestamp()
    .setColor(Discord.Colors.Green)

const invalidUsage = new Discord.EmbedBuilder()
    .setTitle("Invalid Usage!")
    .setDescription("Usage: `/subscribe queue`, `/subscribe townless`")
    .setTimestamp()
    .setColor(Discord.Colors.Red)

export default {
    name: "subscribe",
    description: "Subscribes a channel to receive live data.",
    run: async (client: Discord.Client, interaction: Discord.ChatInputCommandInteraction) => {
        if (!interaction.guild) interaction.reply({embeds: [
            new Discord.EmbedBuilder()
            .setTitle("Error while using /sub:")
            .setDescription("You can't use `/sub` in a direct message!")
            .setColor(Discord.Colors.Red)
            .setTimestamp()], ephemeral: true
        })

        const member = interaction.member as Discord.GuildMember
        const channel = interaction.channel

        if (!member.permissionsIn(channel).has(ManageMsgs)) {
            return interaction.reply({embeds: [
                new Discord.EmbedBuilder()
                    .setDescription("<:red_tick:1036290475012915270> You need either the Manage Messages permission or the Manage Channels permission to subscribe!")
                    .setColor(Discord.Colors.Red)
                    .setTimestamp()
                    .setFooter(fn.devsFooter(client))
                ], ephemeral: true
            })
        }

        const subCmd = interaction.options.getSubcommand()
        if (!subCmd) return interaction.reply({ embeds: [
            invalidUsage.setFooter(fn.devsFooter(client))
        ], ephemeral: true })

        const channelID = channel.id
        const memberID = member.id
        const db = admin.firestore()

        switch (subCmd.toLowerCase()) {
            case "queue": {
                const queueSubbedChannels = db.collection("subs").doc("queue")

                queueSubbedChannels.get().then(async doc => {
                    if (!doc.exists) return
                    
                    if (doc.data().channelIDs.includes(channelID)) return interaction.reply({embeds: [
                        new Discord.EmbedBuilder()
                        .setTitle("Subscription Failed")
                        .setDescription("This channel is already subscribed to live queue updates.")
                        .setTimestamp()
                        .setColor(Discord.Colors.Red)
                    ], ephemeral: true})

                    await queueSubbedChannels.update({ channelIDs: FieldValue.arrayUnion(channelID) })
                    fn.queueSubbedChannelArray.push(channelID)

                    await interaction.channel.send({embeds: [
                        new Discord.EmbedBuilder()
                        .setColor(Discord.Colors.Green)
                        .setTitle("Live Queue Count")
                        .setDescription("This message will be edited shortly with queue updates.")
                        .setTimestamp()
                    ]})

                    subscriptionSuccess.setDescription(`<@${memberID}> has successfully subscribed this channel to receive queue updates.`)
                    return interaction.reply({embeds: [subscriptionSuccess]})

                }).catch(err => console.log("Error getting document: \n", err))

                break
            }
            case "townless": {
                const townlessSubbedChannels = db.collection("subs").doc("townless")

                townlessSubbedChannels.get().then(async doc => {
                    if (!doc.exists) return
    
                    if (doc.data().channelIDs.includes(channelID)) return interaction.reply({embeds: [
                        new Discord.EmbedBuilder()
                        .setTitle("Subscription Failed")
                        .setDescription("This channel is already subscribed to live townless players.")
                        .setColor(Discord.Colors.Red)
                        .setTimestamp()
                    ], ephemeral: true })
                  
                    const embed = new Discord.EmbedBuilder()
                        .setDescription("This message will be edited shortly with townless players.")
                        .setColor(Discord.Colors.DarkPurple)
                        .setTimestamp()

                    await interaction.channel.send({ embeds: [embed.setTitle("Live Townless Players (Nova)")] })
                    await interaction.channel.send({ embeds: [embed.setTitle("Live Townless Players (Aurora)")] })
                  
                    await townlessSubbedChannels.update({ channelIDs: FieldValue.arrayUnion(channelID) })
                    fn.townlessSubbedChannelArray.push(channelID)
    
                    subscriptionSuccess.setDescription(`<@${memberID}> has successfully subscribed this channel to receive live townless players.`)
                    return interaction.reply({embeds: [subscriptionSuccess]})
                }).catch(err => console.log("Error getting document: \n", err))

                break
            }
            default: return interaction.reply({ embeds: [
                invalidUsage.setFooter(fn.devsFooter(client))
            ], ephemeral: true })
        }
    }, data: new Discord.SlashCommandBuilder()
        .setName("subscribe")
        .setDescription("Subscribes a channel to feeds.")
        .addSubcommand(subCmd => subCmd.setName('queue').setDescription('Subscribes channel to receive live queue updates.'))
        .addSubcommand(subCmd => subCmd.setName('townless').setDescription('Subscribes channel to receive live townless updates.'))
}