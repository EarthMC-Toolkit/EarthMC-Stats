import { 
    type BaseInteraction
} from 'discord.js'

import type { 
    ExtendedClient,
    DJSEvent
} from '../types.js'

const interactionCreate: DJSEvent = {
    name: 'interactionCreate',
    async execute(interaction: BaseInteraction) {
        const client: ExtendedClient = interaction.client
        const username = interaction.user.displayName

        if (interaction.isChatInputCommand()) {
            const cmd = client.slashCommands.get(interaction.commandName)
            if (!cmd) return
        
            console.log(`[${username}] Interaction triggered: '${interaction.commandName}'`)
            return await cmd.run(client, interaction).catch(console.error)
        }

        if (interaction.isAutocomplete()) {
            const cmd = client.slashCommands.get(interaction.commandName)
            if (!cmd?.autocomplete) return

            return await cmd.autocomplete(client, interaction).catch(console.error)
        }

        if (interaction.isModalSubmit()) {
            console.log(`${username} submitted a modal.`)

            // if (interaction.customId == "alliance_create") {
            //     const userId = interaction.member.user.id
            //     const modal = cache.get(`${userId}_creating`) satisfies AllianceModal

            //     //console.log(`Created a new alliance!\n${JSON.stringify(modal.alliance)}`)
            //     const alliance = modal.asObject(interaction)

            //     //#region Send alliance embed preview.
            //     const preview = new CustomEmbed(client, `(${alliance.map}) Alliance Preview | ${alliance.allianceName}`)
            //         .setColor(Colors.DarkBlue)
            //         .setThumbnail(alliance.imageURL ? alliance.imageURL : 'attachment://aurora.png')
            //         .addButton('creation_extra', 'Extra')
            //         .addButton('creation_finish', 'Finish', ButtonStyle.Success)
            //         .addField("Leader(s)", alliance.leaderName.length > 0 ? alliance.leaderName : "None", true)

            //     if (alliance.discordInvite != "No discord invite has been set for this alliance") {
            //         preview.setURL(alliance.discordInvite)
            //     }
                
            //     const allianceNationsLength = alliance.nations.length
            //     const nationsString = alliance.nations.join(", ")
        
            //     if (nationsString.length < 1024) {
            //         const val = allianceNationsLength <= 0 
            //             ? "There are no nations in this alliance." 
            //             : "```" + nationsString + "```"

            //         preview.addField(`Nations [${allianceNationsLength}]`, val)
            //     }
            //     else {
            //         preview.addField(
            //             `Nations [${allianceNationsLength}]`, 
            //             "Too many nations to display! Click the 'view all' button to see the full list."
            //         )

            //         preview.addButton('view_all_nations', 'View All Nations', ButtonStyle.Primary)
            //     }

            //     // let modal = new AllianceModal('alliance_extra', 'Extra options')
            //     // modal.extra().show()

            //     preview.setFiles(alliance.imageURL ? [] : [fn.AURORA.thumbnail])
            //     return preview.modalReply(interaction)
            //     //#endregion
            // }
        }

        if (interaction.isButton()) {
            const button = client.buttons.get(interaction.customId)
            if (!button) return
            
            return button.execute(client, interaction).catch(console.error)
        }
    }
}

export default interactionCreate