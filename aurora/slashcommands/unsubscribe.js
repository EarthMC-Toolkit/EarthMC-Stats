const Discord = require('discord.js'),
      fn = require('../../bot/utils/fn'),
      admin = require("firebase-admin"),
      FieldValue = admin.firestore.FieldValue,
      { SlashCommandBuilder } = require('@discordjs/builders')

async function unsub(subbedChannels, interaction, subTypeName) {
    const channelID = interaction.channelId

    subbedChannels.get().then(doc => {
        if (!doc.exists) return
        
        if (!doc.data().channelIDs.includes(channelID))
            return interaction.reply({ embeds: [
                new Discord.MessageEmbed()
                    .setTitle("Unsubscription Failed")
                    .setDescription(`This channel is not subscribed to receive ${subTypeName} updates.`)
                    .setColor("RED")
                    .setTimestamp() 
                ], ephemeral: true 
            })

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

        return interaction.reply({embeds: [new Discord.MessageEmbed()
            .setTitle("Unsubscription Success!")
            .setColor("GREEN")
            .setDescription(`<@${interaction.member.id}> has successfully unsubscribed this channel from receiving ${subTypeName} updates.`)
            .setTimestamp()
        ]})

    }).catch(err => console.log("Error getting document: ", err))
}

module.exports = {
  name: "unsubscribe",
  /**
  * @param {Discord.Client} client 
  * @param {Discord.CommandInteraction} interaction 
  */
  run: async (client, interaction) => {
        if (interaction.channel.type == "DM") return interaction.reply({embeds: [
            new Discord.MessageEmbed()
                .setTitle("Error while using /unsub:")
                .setDescription("You can't use /unsub in a direct message!")
                .setColor("RED")
                .setTimestamp()
        ], ephemeral: true })

        if (!interaction.member.permissionsIn(interaction.channel).has('MANAGE_MESSAGES'))
            return interaction.reply({embeds: [new Discord.MessageEmbed()
                .setDescription("<:red_tick:1036290475012915270> You need either the Manage Messages permission or the Manage Channels permission to unsubscribe!")
                .setColor("RED")
                .setTimestamp()
                .setFooter(fn.devsFooter(client))
            ], ephemeral: true })

        const invalidUsage = new Discord.MessageEmbed()
            .setTitle("Invalid Usage!")
            .setDescription("Usage: `/unsubscribe queue`, `/unsubscribe townless`")
            .setColor("RED")
            .setFooter(fn.devsFooter(client))
            .setTimestamp()

        const subsCollection = admin.firestore().collection("subs"),
            comparator = interaction.options.getSubcommand().toLowerCase()

        const validComparators = ['queue', 'townless']
        if (!validComparators.includes(comparator)) 
            return interaction.reply({embeds: [invalidUsage], ephemeral: true})

        unsub(subsCollection.doc(comparator), interaction, comparator)
    }, 
    data: new SlashCommandBuilder().setName("unsubscribe")
        .setDescription("Unsubscribes a channel from feeds.")
        .addSubcommand(subCmd => subCmd.setName('queue').setDescription('Unsubscribes channel from receiving live queue updates.'))
        .addSubcommand(subCmd => subCmd.setName('townless').setDescription('Unsubscribes channel from receiving live townless updates.'))
}