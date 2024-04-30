import {
    type Message, 
    type Client,
    type ChatInputCommandInteraction, 
    Colors, EmbedBuilder, SlashCommandBuilder
} from "discord.js"

import * as emc from "earthmc"
import * as fn from '../../bot/utils/fn.js'
import * as database from "../../bot/utils/database.js"

import { getLinkedPlayer } from "../../bot/utils/linking.js"

const desc = "Used by the nation leader to set custom nation options. (Discord, Flag, Prefix)"

export default {
    name: "nationset",
    description: desc,
    run: async (_: Client, interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply()

        const mapDB = interaction.options.getString("map").toLowerCase() == "nova" ? database.Nova : database.Aurora
        const nations = (await mapDB.getNations()).map(n => {
            n.name = emc.formatString(n.name, true)
            return n
        })

        const nationName = interaction.options.getString("name").toLowerCase()
        const nationIndex = nations.findIndex(n => n.name.toLowerCase() == nationName)

        const nation = nations.find(n => n.name.toLowerCase() == nationName)
        let save = false

        if (!nation) return interaction.editReply({embeds: [new EmbedBuilder()
            .setDescription(`${nationName} is not a registered nation, please try again.`)
            .setColor(Colors.Red)
            .setTimestamp()
        ]}).then((m: Message) => setTimeout(() => m.delete(), 10000)).catch(() => {})

        const userID = interaction.user.id,
              linkedPlayer = await getLinkedPlayer(userID)

        const canEdit = fn.botDevs.includes(userID) || nation.king.toLowerCase() == linkedPlayer.name.toLowerCase()
        if (!linkedPlayer || !canEdit) return interaction.editReply({embeds: [
            new EmbedBuilder()
            .setDescription("You must be linked and be the owner of this nation in order to edit it.")
            .setColor(Colors.Red)
            .setTimestamp()
        ]}).then((m: Message) => setTimeout(() => m.delete(), 10000)).catch(() => {})

        const value = interaction.options.getString("value")
        const cleared = value.toLowerCase() == "none" || value.toLowerCase() == "clear"

        switch (interaction.options.getString("type").toLowerCase()) {
            case "prefix": {
                if (cleared) nation.kingPrefix = ""
                else nation.kingPrefix = value.substring(0, 10)

                const embed = new EmbedBuilder()
                    .setTitle("Nation Updated | " + nation.name)
                    .setDescription(`The king prefix has been ${cleared ? "cleared" : "set to `" + nation.kingPrefix + "`"}.`)
                    .setColor(Colors.Aqua)
                    .setTimestamp()

                await interaction.editReply({ embeds: [embed] })

                break
            }
            case "discord": {
                if (cleared) nation.discord = ""
                else {
                    const inviteRegex = new RegExp(/discord(?:\.com|app\.com|\.gg)[\/invite\/]?(?:[a-zA-Z0-9\-]{2,32})/)
                    if (!inviteRegex.test(value)) {
                        return interaction.editReply({embeds: [
                            new EmbedBuilder()
                            .setDescription(`${value} is not a valid discord invite, please try again.`)
                            .setColor(Colors.Red)
                            .setTimestamp()
                        ]})
                    }

                    nation.discord = value
                }

                const embed = new EmbedBuilder()
                    .setTitle("Nation Updated | " + nation.name)
                    .setDescription(`The nation's discord invite has been ${cleared ? "cleared" : "set to `" + value + "`"}.`) 
                    .setColor(Colors.Aqua)
                    .setTimestamp()

                await interaction.editReply({ embeds: [embed] })

                break
            }
            case "flag": {
                if (cleared) nation.flag = ""
                else {
                    const imageRegex = new RegExp("(https?://.*.(?:png|jpg|jpeg))")
                    if (!imageRegex.test(value)) return interaction.editReply({embeds: [
                        new EmbedBuilder()
                            .setDescription(`${value} is not a valid image link, please try again.`)
                            .setColor(Colors.Red)
                            .setTimestamp()
                    ]})
                    
                    nation.flag = value
                }

                const embed = new EmbedBuilder()
                    .setTitle("Nation Updated | " + nation.name)
                    .setDescription(`The nation's flag has been ${cleared ? "cleared." : "changed to:"}`)
                    .setColor(Colors.Aqua)
                    .setTimestamp()
                
                if (!cleared) embed.setThumbnail(value)
                await interaction.editReply({ embeds: [embed] })

                break
            }
            default: {
                save = false
                return interaction.editReply({embeds: [new EmbedBuilder()
                    .setDescription("<:red_tick:1036290475012915270> Invalid arguments! Options: Prefix, Discord or Flag")
                    .setColor(Colors.Red)
                ]}).then((m: Message) => setTimeout(() => m.delete(), 10000)).catch(() => {})
            }
        }

        if (save) {
            nations[nationIndex] = nation
            mapDB.setNations(nations)
        }
    }, data: new SlashCommandBuilder().setName("nationset")
        .setDescription(desc)
        .addStringOption(option => option.setName("map")
            .setDescription("Name of the map this nation is in, defaults to Aurora.")
            .setRequired(true)
        )
        .addStringOption(option => option.setName("name")
            .setDescription("The name of your nation.")
            .setRequired(true)
        )
        .addStringOption(option => option.setName("type")
            .setDescription("The type of data to set.").setRequired(true)
            .addChoices(
                { name: "King Prefix", value: "prefix" }, 
                { name: "Discord Invite", value: "discord" },
                { name: "Flag", value: "flag" }
            )
        )
        .addStringOption(option => option.setName("value")
            .setDescription("The value of the type specified.")
            .setRequired(true)
        )
}