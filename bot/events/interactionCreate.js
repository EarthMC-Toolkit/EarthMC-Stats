var Discord = require('discord.js'),
    linkManager = require('../utils/linking'),
    MC = require('../utils/minecraft'),
    fn = require('../utils/fn'),
    //AllianceModal = require('../objects/AllianceModal'),
    { CustomEmbed } = require('../objects/CustomEmbed')

const cache = require('memory-cache')

var target = null

module.exports = {
    name: 'interactionCreate',
    /**
    @param { Discord.Interaction } interaction
    */
    async execute(interaction) {
        const client = interaction.client
        
        if (interaction.isCommand()) {
            const cmd = client.slashCommands.get(interaction.commandName)
            if (!cmd) return
        
            console.log(`${interaction.user.username} used command: '${interaction.commandName}'`)
            return await cmd.run(client, interaction).catch(console.error)
        }

        if (interaction.isUserContextMenu()) {
            console.log(`${interaction.user.username} triggered a context menu action.`)

            if (interaction.commandName == "Link User") 
                return await showLinkModal(interaction)    
        }
        
        if (interaction.isModalSubmit()) {   
            console.log(`${interaction.user.username} submitted a modal.`)

            if (interaction.customId == "link") 
                return await submitLinkModal(interaction)

            if (interaction.customId == "alliance_create") {
                const key = interaction.member.user.id
                const modal = cache.get(`${key}_creating`)

                //console.log(`Created a new alliance!\n${JSON.stringify(modal.alliance)}`)
                const alliance = modal.asObject(interaction)

                //#region Send alliance embed preview.
                const preview = new CustomEmbed(client, `(${alliance.mapName}) Alliance Preview | ${alliance.allianceName}`)
                    .setColor("DARK_BLUE")
                    .setThumbnail(alliance.imageURL ? alliance.imageURL : 'attachment://aurora.png')
                    .addButton('creation_extra', 'Extra')
                    .addButton('creation_finish', 'Finish', 'SUCCESS')
                    .addFields({ 
                        name: "Leader(s)",
                        value: alliance.leaders.length > 0 ? alliance.leaders : "None",
                        inline: true
                    })

                if (alliance.discordInvite != "No discord invite has been set for this alliance") 
                    preview.setURL(alliance.discordInvite)
                
                const thumbnail = alliance.imageURL ? [] : [fn.AURORA.thumbnail],
                      allianceNationsLength = alliance.nations.length,
                      nationsString = alliance.nations.join(", ")
        
                if (nationsString.length < 1024) {
                    const field = allianceNationsLength <= 0 ? {
                        name: "Nations [0]", 
                        value: "There are no nations in this alliance."
                    } : { 
                        name: "Nations [" + allianceNationsLength + "]", 
                        value: "```" + nationsString + "```"
                    }

                    preview.addFields(field)
                }
                else {
                    preview.addFields({ 
                        name: "Nations [" + allianceNationsLength + "]", 
                        value: "Too many nations to display! Click the 'view all' button to see the full list."
                    })

                    preview.addButton('view_all_nations', 'View All Nations', 'PRIMARY')
                }

                // let modal = new AllianceModal('alliance_extra', 'Extra options')
                // modal.extra().show()

                return interaction.reply({ embeds: [preview], files: thumbnail })
                //#endregion
            }
        }
    }
}

const showLinkModal = async (interaction) => {
    const roleID = '966359842417705020',
          editor = interaction.member.roles.cache.has(roleID)

    if (!fn.botDevs.includes(interaction.user.id) && !editor) 
        return interaction.reply({embeds: [new Discord.MessageEmbed()
            .setColor("RED")
            .setTitle("Insufficient Permissions")
            .setDescription("Only editors and bot developers can link users.")
            .setFooter(fn.devsFooter(interaction.client)).setTimestamp()
        ], ephemeral: true })

    const ignInput = new Discord.TextInputComponent()
        .setCustomId('ign')
        .setLabel("Enter user's Minecraft name")
        .setStyle('SHORT')

    const ignRow = new Discord.MessageActionRow().addComponents(ignInput)
    const modal = new Discord.Modal()
        .setCustomId('link')
        .setTitle('Link User')
        .addComponents(ignRow)
    
    target = interaction.targetUser
    return await interaction.showModal(modal)
}

const submitLinkModal = async (interaction) => {
    await interaction.deferReply()
    
    const ign = interaction.fields.getTextInputValue('ign'),
          player = await MC.Players.get(ign).catch(console.error)

    if (!player) return await interaction.editReply({embeds: [
        new Discord.MessageEmbed()
            .setDescription(`<:red_tick:1036290475012915270> '${ign}' is not a registered player name, please try again.`)
            .setColor("RED")
            .setTimestamp()
    ], ephemeral: true })
 
    //console.log(`Attempting to link '${target.username}'`)

    const linkedPlayer = await linkManager.getLinkedPlayer(ign)
    if (linkedPlayer != null) return interaction.editReply({embeds: [
        new Discord.MessageEmbed()
            .setDescription(`<:red_tick:1036290475012915270> That player is already linked to <@${linkedPlayer.linkedID}>.`)
            .setColor("RED")
            .setTimestamp()
    ]}).then(m => setTimeout(() => m.delete(), 10000))

    const userID = target.id
    if (!userID || !new RegExp(/[0-9]{18}/).test(userID)) return interaction.editReply({embeds: [
        new Discord.MessageEmbed()
            .setDescription("<:red_tick:1036290475012915270> Invalid user or ID, please try again.")
            .setColor("RED")
            .setTimestamp()
    ]}).then(m => setTimeout(() => m.delete(), 10000))

    await linkManager.linkPlayer(userID, player.name)
    interaction.editReply({embeds: [
        new Discord.MessageEmbed()
            .setDescription(`<:green_tick:1036290473708495028> ${player.name.replace(/_/g, "\\_")} is now linked with <@${userID}>.`)
            .setColor("GREEN")
            .setTimestamp()
    ]})
}