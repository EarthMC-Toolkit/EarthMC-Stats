import {
    type GuildMember,
    type CommandInteractionOptionResolver,
    type ChatInputCommandInteraction,
    Colors, EmbedBuilder, SlashCommandBuilder
} from "discord.js"

import * as database from '../../../bot/utils/db/index.js'
import { botDevs } from '../../../bot/utils/fn.js'

import AllianceModal from '../../../bot/objects/AllianceModal.js'
import type { SlashCommand } from "../../../bot/types.js"

const editingChannels = ["971408026516979813"]
const editorRole = "966359842417705020"

const checkEditor = async (interaction: ChatInputCommandInteraction) => {
    const author = interaction.member as GuildMember
    const isEditor = editingChannels.includes(interaction.channelId) && author.roles.cache.has(editorRole)

    if (!botDevs.includes(author.id) && !isEditor) interaction.reply({embeds: [new EmbedBuilder()
        .setTitle("That command is for editors only!\nIf you are an editor, you're probably in the wrong channel.")
        .setColor(Colors.Red)
        .setTimestamp()
        .setAuthor({
            name: author.user.username,
            iconURL: author.displayAvatarURL()
        })
    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
}

const getAlliance = async (options: CommandInteractionOptionResolver, skipCache = true) => {
    //const map = options.getString('map').toLowerCase() == 'nova' ? database.Nova : database.Aurora
    const input = options.getString('name').toLowerCase()

    const alliances = await database.AuroraDB.getAlliances(skipCache)
    return alliances?.find(a => a.allianceName.toLowerCase() == input) ?? null
}

const cmdData = new SlashCommandBuilder()
    .setName("alliance")
    .setDescription("Used by editors to create or update an alliance.")
    .addSubcommand(subCmd => subCmd.setName('create').setDescription('Create a new alliance.')
        .addStringOption(option => option.setName("map")
            .setDescription("Choose a map this new alliance will apply to.").setRequired(true)
            .addChoices({ name: "Aurora", value: "aurora" }, { name: "Nova", value: "nova" })
        )
        .addStringOption(option => option.setName("name")
            .setDescription("Enter a name for this new alliance.")
            .setRequired(true)
        )
    )
    .addSubcommand(subCmd => subCmd.setName('edit').setDescription('Edit an existing alliance.')
        .addStringOption(option => option.setName("map")
            .setDescription("Choose a map the edits will apply to.").setRequired(true)
            .addChoices({ name: "Aurora", value: "aurora" }, { name: "Nova", value: "nova" })
        )
        .addStringOption(option => option.setName("name")
            .setDescription("Enter name of the alliance to edit.")
            .setRequired(true)
        )
    )

const allianceCmd: SlashCommand<typeof cmdData> = {
    data: cmdData,
    name: "alliance",
    run: async (_, interaction: ChatInputCommandInteraction) => {
        const opts = interaction.options as CommandInteractionOptionResolver
        const cmd = opts.getSubcommand().toLowerCase()

        switch(cmd) {
            case "lookup": {
                break
            }
            case "create": {
                await checkEditor(interaction) 
                const foundAlliance = await getAlliance(opts, false)

                // Make sure it doesn't exist already.
                if (foundAlliance) return interaction.reply({embeds: [new EmbedBuilder()
                    .setColor(Colors.Red)
                    .setTitle("Error creating alliance!")
                    .setDescription("That alliance already exists.\nChoose another name or disband/rename the current one.")
                    .setTimestamp()
                ]})
            
                const creationModal = new AllianceModal('alliance_create', 'Creating an alliance')
                return creationModal.main(opts).show(interaction)
            }
            case "edit": {
                await checkEditor(interaction)
                const foundAlliance = await getAlliance(opts, false) 

                // Make sure it exists already.
                if (!foundAlliance) return interaction.reply({embeds: [new EmbedBuilder()
                    .setColor(Colors.Red)
                    .setTitle("Error editing alliance!")
                    .setDescription("That alliance does not exist.")
                    .setTimestamp()
                ]})

                const editingModal = new AllianceModal('alliance_edit', 'Editing an alliance', foundAlliance)
                return editingModal.main(opts).show(interaction)
            }
            case "disband": {
                // Check dev perm.
                
            }
        }
        
        // Grab and apply field values to current alliance.
        
        // Overwrite alliance at database index.

        // Handle success message

    }
}

export default allianceCmd
