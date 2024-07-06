import {
    type GuildMember, 
    type Client,
    type ChatInputCommandInteraction,
    Colors, EmbedBuilder, SlashCommandBuilder,
    PermissionFlagsBits
} from 'discord.js'

import * as fn from '../../bot/utils/fn.js'

import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const subscriptionSuccess = new EmbedBuilder()
    .setTitle("Subscription Success!")
    .setTimestamp()
    .setColor(Colors.Green)

const invalidUsage = new EmbedBuilder()
    .setTitle("Invalid Usage!")
    .setDescription("Usage: `/subscribe queue`, `/subscribe townless`")
    .setTimestamp()
    .setColor(Colors.Red)

export default {
    name: "subscribe",
    description: "Subscribes a channel to receive live data.",
    disabled: true,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        if (!interaction.guild) interaction.reply({embeds: [
            new EmbedBuilder()
            .setTitle("Error while using /sub:")
            .setDescription("You can't use `/sub` in a direct message!")
            .setColor(Colors.Red)
            .setTimestamp()], ephemeral: true
        })

        const member = interaction.member as GuildMember
        const channel = interaction.channel

        if (!member.permissionsIn(channel).has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({embeds: [new EmbedBuilder()
                .setDescription("<:red_tick:1036290475012915270> You need either the Manage Messages permission or the Manage Channels permission to subscribe!")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter(fn.devsFooter(client))
            ], ephemeral: true})
        }

        const subCmd = interaction.options.getSubcommand()
        if (!subCmd) return interaction.reply({embeds: [
            invalidUsage.setFooter(fn.devsFooter(client))
        ], ephemeral: true})

        const channelID = channel.id
        const memberID = member.id
        const db = getFirestore()

        switch (subCmd.toLowerCase()) {
            case "queue": {
                const queueSubbedChannels = db.collection("subs").doc("queue")

                queueSubbedChannels.get().then(async doc => {
                    if (!doc.exists) return
                    
                    if (doc.data().channelIDs.includes(channelID)) return interaction.reply({embeds: [
                        new EmbedBuilder()
                        .setTitle("Subscription Failed")
                        .setDescription("This channel is already subscribed to live queue updates.")
                        .setTimestamp()
                        .setColor(Colors.Red)
                    ], ephemeral: true})

                    await queueSubbedChannels.update({ channelIDs: FieldValue.arrayUnion(channelID) })
                    fn.queueSubbedChannelArray.push(channelID)

                    await interaction.channel.send({embeds: [
                        new EmbedBuilder()
                        .setColor(Colors.Green)
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
                        new EmbedBuilder()
                        .setTitle("Subscription Failed")
                        .setDescription("This channel is already subscribed to live townless players.")
                        .setColor(Colors.Red)
                        .setTimestamp()
                    ], ephemeral: true })
                  
                    const embed = new EmbedBuilder()
                        .setDescription("This message will be edited shortly with townless players.")
                        .setColor(Colors.DarkPurple)
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
    }, data: new SlashCommandBuilder()
        .setName("subscribe")
        .setDescription("Subscribes a channel to feeds.")
        .addSubcommand(subCmd => subCmd.setName('queue').setDescription('Subscribes channel to receive live queue updates.'))
        .addSubcommand(subCmd => subCmd.setName('townless').setDescription('Subscribes channel to receive live townless updates.'))
}