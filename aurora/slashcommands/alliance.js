const Discord = require("discord.js"),
      { SlashCommandBuilder } = require('@discordjs/builders'),
      database = require('../../bot/utils/database'),
      fn = require('../../bot/utils/fn'),
      AllianceModal = require('../../bot/objects/AllianceModal')

const editingChannels = ["971408026516979813"]

/**
 * @param { Discord.CommandInteraction } interaction 
 */
const checkEditor = async interaction => {
    const author = interaction.member,
          isEditor = editingChannels.includes(interaction.channelId) && author.roles.cache.has('966359842417705020')

    if (!fn.botDevs.includes(author.id) && !isEditor) {
        return interaction.reply({embeds: [new Discord.MessageEmbed()
            .setTitle("That command is for editors only!")
            .setAuthor({ name: author.user.username, iconURL: author.displayAvatarURL() })
            .setColor("RED")
            .setTimestamp()
        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
    }
}

/**
 * @param { Discord.CommandInteractionOptionResolver } options 
 * @param { boolean } skipCache 
 */
const getAlliance = async (options, skipCache = true) => {
    const map = options.getString('map').toLowerCase() == 'nova' ? database.Nova : database.Aurora,
          input = options.getString('name').toLowerCase()

    const alliances = await map.getAlliances(skipCache).catch(console.error)
    return alliances?.find(a => a.allianceName.toLowerCase() == input) ?? null
}

module.exports = {
    name: "alliance",
    run: async (client, interaction) => {
        const opts = interaction.options
        const cmd = opts.getSubcommand().toLowerCase()

        await checkEditor(interaction) 
        const foundAlliance = await getAlliance(opts, false)

        switch(cmd) {
            case "create": {
                // Make sure it doesn't exist already.
                if (foundAlliance) return interaction.reply({embeds: [
                    new Discord.MessageEmbed()
                    .setColor("RED")
                    .setTitle("Error creating alliance!")
                    .setDescription("That alliance already exists.\nChoose another name or disband/rename the current one.")
                    .setTimestamp()
                ]})
            
                const creationModal = new AllianceModal('alliance_create', 'Creating an alliance')
                return creationModal.main(opts).show(interaction)
            }
            case "edit": {
                // Make sure it exists already.
                if (!foundAlliance) return interaction.reply({embeds: [
                    new Discord.MessageEmbed()
                    .setColor("RED")
                    .setTitle("Error editing alliance!")
                    .setDescription("That alliance does not exist.")
                    .setTimestamp()
                ]})

                const editingModal = new AllianceModal('alliance_edit', 'Editing an alliance', foundAlliance)
                editingModal.main(opts).show(interaction)

                break
            }
            case "disband": {
                // Check dev perm.
                
            }
        }
        
        // Grab and apply field values to current alliance.
        
        // Overwrite alliance at database index.

        // Handle success message

    }, data: new SlashCommandBuilder()
        .setName("alliance")
        .setDescription("Used by editors to create or update an alliance.")
        .addSubcommand(subCmd => subCmd.setName('create').setDescription('Create a new alliance.')
            .addStringOption(option => option.setName("map")
                .setDescription("Choose a map this new alliance will apply to.").setRequired(true)
                .addChoices({ name: "Aurora", value: "aurora" }, { name: "Nova", value: "nova" }))
            .addStringOption(option => option.setName("name")
                .setDescription("Enter a name for this new alliance.")
                .setRequired(true))
        )
        .addSubcommand(subCmd => subCmd.setName('edit').setDescription('Edit an existing alliance.')
            .addStringOption(option => option.setName("map")
                .setDescription("Choose a map the edits will apply to.").setRequired(true)
                .addChoices({ name: "Aurora", value: "aurora" }, { name: "Nova", value: "nova" }))
            .addStringOption(option => option.setName("name")
                .setDescription("Enter name of the alliance to edit.")
                .setRequired(true))
        )
}