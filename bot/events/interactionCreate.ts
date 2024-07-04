import { 
    type GuildMemberRoleManager,
    type Collection,
    type BaseInteraction,
    type ModalSubmitInteraction, 
    type UserContextMenuCommandInteraction, 
    ButtonStyle, Colors, 
    EmbedBuilder, ModalBuilder, ActionRowBuilder,
    TextInputBuilder, TextInputStyle
} from 'discord.js'

import { cache } from '../constants.js'

import * as MC from '../utils/minecraft.js'
import * as fn from '../utils/fn.js'

import { getLinkedPlayer, linkPlayer } from '../utils/linking.js'
import { CustomEmbed } from '../objects/CustomEmbed.js'

import type { Button } from '../types.js'
import type AllianceModal from '../objects/AllianceModal.js'

let target = null

export default {
    name: 'interactionCreate',
    async execute(interaction: BaseInteraction) {
        const [client, username] = [interaction.client, interaction.user.username]

        let cmdName: string = null
        if (interaction.isCommand())
            cmdName = interaction.commandName

        if (interaction.isChatInputCommand()) {
            const cmd = client['slashCommands'].get(cmdName)
            if (!cmd) return
        
            console.log(`${username} used command: '${cmdName}'`)
            return await cmd.run(client, interaction).catch(console.error)
        }

        if (interaction.isUserContextMenuCommand()) {
            console.log(`${username} triggered a context menu action.`)

            if (cmdName == "Link User") {
                console.log('Attempting to link a player')
                return await showLinkModal(interaction)  
            }
        }
        
        if (interaction.isModalSubmit()) {   
            console.log(`${username} submitted a modal.`)

            if (interaction.customId == "link") 
                return await submitLinkModal(interaction)

            if (interaction.customId == "alliance_create") {
                const key = interaction.member.user.id
                const modal = cache.get(`${key}_creating`) as AllianceModal

                //console.log(`Created a new alliance!\n${JSON.stringify(modal.alliance)}`)
                const alliance = modal.asObject(interaction)

                //#region Send alliance embed preview.
                const preview = new CustomEmbed(client, `(${alliance.mapName}) Alliance Preview | ${alliance.allianceName}`)
                    .setColor(Colors.DarkBlue)
                    .setThumbnail(alliance.imageURL ? alliance.imageURL : 'attachment://aurora.png')
                    .addButton('creation_extra', 'Extra')
                    .addButton('creation_finish', 'Finish', ButtonStyle.Success)
                    .addField("Leader(s)", alliance.leaders.length > 0 ? alliance.leaders : "None", true)

                if (alliance.discordInvite != "No discord invite has been set for this alliance") 
                    preview.setURL(alliance.discordInvite)
                
                const allianceNationsLength = alliance.nations.length
                const nationsString = alliance.nations.join(", ")
        
                if (nationsString.length < 1024) {
                    const val = allianceNationsLength <= 0 
                        ? "There are no nations in this alliance." 
                        : "```" + nationsString + "```"

                    preview.addField(`Nations [${allianceNationsLength}]`, val)
                }
                else {
                    preview.addField(
                        `Nations [${allianceNationsLength}]`, 
                        "Too many nations to display! Click the 'view all' button to see the full list."
                    )

                    preview.addButton('view_all_nations', 'View All Nations', ButtonStyle.Primary)
                }

                // let modal = new AllianceModal('alliance_extra', 'Extra options')
                // modal.extra().show()

                preview.setFiles(alliance.imageURL ? [] : [fn.AURORA.thumbnail])
                return preview.modalReply(interaction)
                //#endregion
            }
        }

        if (interaction.isButton()) {
            const btns = client['buttons'] as Collection<string, Button>
            const button = btns.get(interaction.customId)
            if (!button) return
            
            return button.execute(client, interaction).catch(console.error)
        }
    }
}

const ignInput = new TextInputBuilder()
    .setCustomId('ign')
    .setLabel("Enter user's Minecraft name")
    .setStyle(TextInputStyle.Short)
    .setMinLength(3)
    .setMaxLength(16)

const editorRoleID = '966359842417705020'
const showLinkModal = async (interaction: UserContextMenuCommandInteraction) => {
    const roles = interaction.member.roles as GuildMemberRoleManager
    const editor = roles.cache.has(editorRoleID)

    if (!fn.botDevs.includes(interaction.user.id) && !editor) 
        return interaction.reply({embeds: [new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle("Insufficient Permissions")
            .setDescription("Only editors and bot developers can link users.")
            .setFooter(fn.devsFooter(interaction.client)).setTimestamp()
        ], ephemeral: true })

    const ignRow = new ActionRowBuilder<TextInputBuilder>()
    ignRow.addComponents(ignInput)

    const modal = new ModalBuilder()
        .setCustomId('link')
        .setTitle('Link User')
        .addComponents(ignRow)
    
    target = interaction.targetUser
    return await interaction.showModal(modal)
}

const submitLinkModal = async (interaction: ModalSubmitInteraction) => {
    await interaction.deferReply()
    
    const ign = interaction.fields.getTextInputValue('ign')
    const player = await MC.Players.get(ign).catch(console.error)

    if (!player) return await interaction.editReply({embeds: [
        new EmbedBuilder()
        .setDescription(`<:red_tick:1036290475012915270> '${ign}' is not a registered player name, please try again.`)
        .setColor(Colors.Red)
        .setTimestamp()
    ]})
 
    //console.log(`Attempting to link '${target.username}'`)

    const linkedPlayer = await getLinkedPlayer(ign)
    if (linkedPlayer != null) return interaction.editReply({embeds: [
        new EmbedBuilder()
        .setDescription(`<:red_tick:1036290475012915270> That player is already linked to <@${linkedPlayer.linkedID}>.`)
        .setColor(Colors.Red)
        .setTimestamp()
    ]}).then(m => setTimeout(() => m.delete(), 10000))

    const userID = target.id
    if (!userID || !new RegExp(/[0-9]{18}/).test(userID)) return interaction.editReply({embeds: [
        new EmbedBuilder()
        .setDescription("<:red_tick:1036290475012915270> Invalid user or ID, please try again.")
        .setColor(Colors.Red)
        .setTimestamp()
    ]}).then(m => setTimeout(() => m.delete(), 10000))

    await linkPlayer(userID, player.name)
    interaction.editReply({embeds: [
        new EmbedBuilder()
        .setDescription(`<:green_tick:1036290473708495028> ${player.name.replace(/_/g, "\\_")} is now linked with <@${userID}>.`)
        .setColor(Colors.Green)
        .setTimestamp()
    ]})
}