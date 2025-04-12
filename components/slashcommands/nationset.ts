import {
    type Message, 
    type Client,
    type ChatInputCommandInteraction, 
    Colors, EmbedBuilder, SlashCommandBuilder
} from "discord.js"

import { 
    formatString,
    OfficialAPI
} from "earthmc"

import { botDevs } from '../../bot/utils/fn.js'
import { AuroraDB } from '../../bot/utils/db/index.js'

import type { 
    DBSquaremapNation,
    SlashCommand
} from "../../bot/types.js"

const desc = "Used by the nation leader to set custom nation options. (Discord, Flag, Prefix)"
const cmdData = new SlashCommandBuilder()
    .setName("nationset")
    .setDescription(desc)
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

const nationSetCmd: SlashCommand<typeof cmdData> = {
    name: "nationset",
    description: desc,
    data: cmdData,
    run: async (_: Client, interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply()

        const nations = await AuroraDB.getNations().then(arr => arr.map(n => {
            n.name = formatString(n.name, true)
            return n
        }))

        const nationName = interaction.options.getString("name").toLowerCase()

        const nation = nations.find(n => n.name.toLowerCase() == nationName)
        const nationIndex = nations.findIndex(n => n.name.toLowerCase() == nationName)

        if (!nation) return interaction.editReply({embeds: [new EmbedBuilder()
            .setDescription(`${nationName} is not a registered nation, please try again.`)
            .setColor(Colors.Red)
            .setTimestamp()
        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

        const userID = interaction.user.id

        // Not a bot dev, check if this user is linked to the king ign.
        if (!botDevs.includes(userID)) {
            const uuid = await OfficialAPI.V3.uuidFromDiscord(userID).then(arr => arr[0])
            const linkedPlayer = await OfficialAPI.V3.players(uuid).then(arr => arr[0])

            const canEdit = nation.king.toLowerCase() == linkedPlayer?.name.toLowerCase()
            if (!canEdit) {
                return interaction.editReply({embeds: [new EmbedBuilder()
                    .setDescription(`
                        In order to edit it this nation's info, you must:
                        - Be the owner of this nation (NOT a representative).
                        - Have your Discord linked to your in-game name.
                    `)
                    .setColor(Colors.Red)
                    .setTimestamp()
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
            }
        }

        const value = interaction.options.getString("value")
        const cleared = value.toLowerCase() == "none" || value.toLowerCase() == "clear"

        const save = (n: DBSquaremapNation) => {
            nations[nationIndex] = n
            AuroraDB.setNations(nations)
        }

        const type = interaction.options.getString("type")
        switch (type.toLowerCase()) {
            case "prefix": {
                if (cleared) nation.kingPrefix = ""
                else nation.kingPrefix = value.substring(0, 10)

                const embed = new EmbedBuilder()
                    .setTitle("Nation Updated | " + nation.name)
                    .setDescription(`The king prefix has been ${cleared ? "cleared" : "set to `" + nation.kingPrefix + "`"}.`)
                    .setColor(Colors.Aqua)
                    .setTimestamp()

                await interaction.editReply({ embeds: [embed] })
                return save(nation)
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
                
                await interaction.editReply({embeds: [new EmbedBuilder()
                    .setTitle("Nation Updated | " + nation.name)
                    .setDescription(`The nation's discord invite has been ${cleared ? "cleared" : "set to `" + value + "`"}.`) 
                    .setColor(Colors.Aqua)
                    .setTimestamp()
                ]})

                return save(nation)
            }
            case "flag": {
                if (cleared) nation.flag = ""
                else {
                    const imageRegex = new RegExp("(https?://(?:[^/.]+)(?:\.[^/.]+)+/[^/]*\.(?:png|jpg|jpeg))")
                    if (!imageRegex.test(value)) return interaction.editReply({embeds: [
                        new EmbedBuilder()
                        .setDescription(`
                            ${value} is not a valid image link, please try again following these rules:
                            - Must begin with \`https://\`.
                            - Must be a \`PNG\`, \`JPG\` or \`JPEG\`.
                            - Must be the source image itself and **NOT** the host domain (use 'Open image in new tab').
                            - The image must live on a valid domain without a region lock, paywall, authorization etc.
                        `)
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

                return save(nation)
            }
            default: return interaction.editReply({embeds: [new EmbedBuilder()
                .setDescription("<:red_tick:1036290475012915270> Invalid arguments! Options: Prefix, Discord or Flag")
                .setColor(Colors.Red)
            ]}).then((m: Message) => setTimeout(() => m.delete(), 10000)).catch(() => {})
        }
    }
}

export default nationSetCmd