const Discord = require('discord.js'),
      fn = require('../../bot/utils/fn'),
      admin = require('firebase-admin'),
      FieldValue = admin.firestore.FieldValue,
      { SlashCommandBuilder } = require('@discordjs/builders')

module.exports = {
    name: "subscribe",
    description: "Subscribes a channel to receive live data.",
    /**
    * @param {Discord.CommandInteraction} interaction
    * @param {Discord.Client} client
    * @returns
    */
    run: async (client, interaction) => {
        if (interaction.channel.type == "DM") return interaction.reply({embeds: [
            new Discord.MessageEmbed()
            .setTitle("Error while using /sub:")
            .setDescription("You can't use `/sub` in a direct message!")
            .setColor("RED")
            .setTimestamp()], ephemeral: true})

        if (!interaction.member.permissionsIn(interaction.channel).has('MANAGE_MESSAGES'))
            return interaction.reply({embeds: [
                new Discord.MessageEmbed()
                    .setDescription("<:red_tick:1036290475012915270> You need either the Manage Messages permission or the Manage Channels permission to subscribe!")
                    .setColor("RED")
                    .setTimestamp()
                    .setFooter(fn.devsFooter(client))
                ], ephemeral: true
            })
        
        const channelID = interaction.channel.id,
              memberID = interaction.member.id,
              db = admin.firestore()

        const subscriptionSuccess = new Discord.MessageEmbed()
            .setTitle("Subscription Success!")
            .setTimestamp()
            .setColor("GREEN")

        const invalidUsage = new Discord.MessageEmbed()
            .setTitle("Invalid Usage!")
            .setDescription("Usage: `/subscribe queue`, `/subscribe townless`")
            .setTimestamp()
            .setColor("RED")
            .setFooter(fn.devsFooter(client))

        const subCmd = interaction.options.getSubcommand()
        if (!subCmd) return interaction.reply({embeds: [invalidUsage], ephemeral: true})

        switch (subCmd.toLowerCase()) {
            case "queue": {
                const queueSubbedChannels = db.collection("subs").doc("queue")

                queueSubbedChannels.get().then(async doc => {
                    if (!doc.exists) return
                    
                    if (doc.data().channelIDs.includes(channelID)) return interaction.reply({embeds: [
                        new Discord.MessageEmbed()
                        .setTitle("Subscription Failed")
                        .setDescription("This channel is already subscribed to live queue updates.")
                        .setTimestamp()
                        .setColor("RED")
                    ], ephemeral: true})

                    await queueSubbedChannels.update({ channelIDs: FieldValue.arrayUnion(channelID) })
                    fn.queueSubbedChannelArray.push(channelID)

                    await interaction.channel.send({embeds: [
                        new Discord.MessageEmbed()
                        .setColor("GREEN")
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
                        new Discord.MessageEmbed()
                        .setTitle("Subscription Failed")
                        .setDescription("This channel is already subscribed to live townless players.")
                        .setColor("RED")
                        .setTimestamp()
                    ], ephemeral: true })
                  
                    const embed = new Discord.MessageEmbed()
                        .setDescription("This message will be edited shortly with townless players.")
                        .setColor("DARK_PURPLE")
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
            default: interaction.reply({ embeds: [invalidUsage], ephemeral: true })
        }
    }, data: new SlashCommandBuilder()
        .setName("subscribe")
        .setDescription("Subscribes a channel to feeds.")
        .addSubcommand(subCmd => subCmd.setName('queue').setDescription('Subscribes channel to receive live queue updates.'))
        .addSubcommand(subCmd => subCmd.setName('townless').setDescription('Subscribes channel to receive live townless updates.'))
}