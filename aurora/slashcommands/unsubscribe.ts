import {
    type Client,
    type GuildMember, 
    type ChatInputCommandInteraction,
    Colors, EmbedBuilder, SlashCommandBuilder,
    PermissionFlagsBits
} from 'discord.js'

import * as fn from '../../bot/utils/fn.js'

import { 
    getFirestore, FieldValue, 
    type DocumentReference
} from "firebase-admin/firestore"

async function unsub(
    subbedChannels: DocumentReference, 
    interaction: ChatInputCommandInteraction, 
    subTypeName: string
) {
    const channelID = interaction.channelId
    subbedChannels.get().then(doc => {
        if (!doc.exists) return
        if (!doc.data().channelIDs.includes(channelID)) return interaction.reply({embeds: [
            new EmbedBuilder()
            .setTitle("Unsubscription Failed")
            .setDescription(`This channel is not subscribed to receive ${subTypeName} updates.`)
            .setColor(Colors.Red)
            .setTimestamp()
        ], ephemeral: true })

        subbedChannels.update({ channelIDs: FieldValue.arrayRemove(channelID) })

        switch(subTypeName) {
            case "queue": {
                const channelIndex = fn.queueSubbedChannelArray.indexOf(channelID)
                fn.queueSubbedChannelArray.splice(channelIndex, 1)

                break
            }
            case "townless": {
                const channelIndex = fn.townlessSubbedChannelArray.indexOf(channelID)
                fn.townlessSubbedChannelArray.splice(channelIndex, 1)
            }
        }

        const member = interaction.member as GuildMember
        return interaction.reply({embeds: [new EmbedBuilder()
            .setTitle("Unsubscription Success!")
            .setColor(Colors.Green)
            .setDescription(`<@${member.id}> has successfully unsubscribed this channel from receiving ${subTypeName} updates.`)
            .setTimestamp()
        ]})

    }).catch(err => console.log("Error getting document: ", err))
}

const validComparators = ['queue', 'townless']
const invalidUsage = new EmbedBuilder()
    .setTitle("Invalid Usage!")
    .setDescription("Usage: `/unsubscribe queue`, `/unsubscribe townless`")
    .setColor(Colors.Red)
    .setTimestamp()

export default {
  name: "unsubscribe",
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        if (!interaction.guild) return interaction.reply({embeds: [
            new EmbedBuilder()
            .setTitle("Error while using /unsub:")
            .setDescription("You can't use /unsub in a direct message!")
            .setColor(Colors.Red)
            .setTimestamp()
        ], ephemeral: true})

        const member = interaction.member as GuildMember
        const channel = interaction.channel

        if (!member.permissionsIn(channel).has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({embeds: [new EmbedBuilder()
                .setDescription("<:red_tick:1036290475012915270> You need either the Manage Messages permission or the Manage Channels permission to unsubscribe!")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter(fn.devsFooter(client))
            ], ephemeral: true })
        }

        const comparator = interaction.options.getSubcommand().toLowerCase()
        if (!validComparators.includes(comparator)) return interaction.reply({embeds: [
            invalidUsage.setFooter(fn.devsFooter(client))
        ], ephemeral: true})

        const db = getFirestore()

        const subsCollection = db.collection("subs")
        unsub(subsCollection.doc(comparator), interaction, comparator)
    }, 
    data: new SlashCommandBuilder().setName("unsubscribe")
        .setDescription("Unsubscribes a channel from feeds.")
        .addSubcommand(subCmd => subCmd.setName('queue').setDescription('Unsubscribes channel from receiving live queue updates.'))
        .addSubcommand(subCmd => subCmd.setName('townless').setDescription('Unsubscribes channel from receiving live townless updates.'))
}