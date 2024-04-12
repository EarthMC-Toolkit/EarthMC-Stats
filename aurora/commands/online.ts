import {
    type Client, 
    type Message, 
    EmbedBuilder, Colors
} from 'discord.js'

import { Aurora } from "earthmc"
import { CustomEmbed } from '../../bot/objects/CustomEmbed.js'

import * as fn from '../../bot/utils/fn.js'

const embed = (client: Client, msg: Message) => new EmbedBuilder()
    .setColor(0x556b2f)
    .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
    .setTimestamp()
    .setFooter(fn.devsFooter(client))

export default {
    name: "online",
    slashCommand: true,
    run: async (client: Client, message: Message, args: string[]) => {
        const req = args.join(" ")
        const m = await message.reply({embeds: [new EmbedBuilder()
            .setTitle("<a:loading:966778243615191110> Fetching activity data, this might take a moment.")
            .setColor(0x556b2f)]
        })

        if (!req) return m.edit({embeds: [new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle("No Arguments Given")
            .setDescription("Arguments: `all`, `staff`/`mods`, `mayors`, `kings`")
        ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

        const onlinePlayers = await Aurora.Players.online().catch(err => console.log(err))
        if (!onlinePlayers) return await m.edit({embeds: [fn.fetchError]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

        switch(args[0].toLowerCase()) {
            case "all": {
                // Alphabetical sort
                fn.sortByKey(onlinePlayers, 'name')

                let page = 1
                if (isNaN(page)) page = 0
                else page--

                const allData = onlinePlayers.map(
                    op => op.name != op.nickname ? `${op.name} (${op.nickname})` : op.name
                ).join('\n').match(/(?:^.*$\n?){1,20}/mg)

                return await new CustomEmbed(client, "(Aurora) Online Activity | All")
                    .setPage(page)
                    .setColor(0x556b2f)
                    .paginate(allData, "```", "```")
                    .editMessage(m)
            }
            case "staff":
            case "mods": {
                const onlineStaff = fn.staff.all().filter(sm => onlinePlayers.find(op => op.name.toLowerCase() == sm.toLowerCase()))
                return m.edit({embeds: [
                    embed(client, message)
                    .setTitle("(Aurora) Online Activity | Staff")
                    .setDescription(onlineStaff.length >= 1 ? "```" + onlineStaff.join(", ").toString() + "```" : "No staff are online right now! Try again later.")
                ]})
            }
            case "mayors": {
                const towns = await Aurora.Towns.all().then(arr =>
                    arr.filter(t => onlinePlayers.find(op => op.name == t.mayor)))
                
                if (!towns) return
                fn.sortByKey(towns, 'mayor')
            
                let page = 1
                if (req.split(" ")[0]) page = parseInt(req.split(" ")[0])
                if (isNaN(page)) page = 0
                else page--
            
                const allData = towns.map(town => `${town.mayor} (${town.name})`).join('\n').match(/(?:^.*$\n?){1,20}/mg)
                return await new CustomEmbed(client, "(Aurora) Online Activity | Mayors")
                    .setPage(page)
                    .setColor(0x556b2f)
                    .paginate(allData, `Total: ${towns.length}$` + "```", "```")
                    .editMessage(m)
            }
            case "kings": {
                const allNations = await Aurora.Nations.all().catch(err => console.log(err))
                if (!allNations || allNations.length < 1) 
                    return await m.edit({embeds: [fn.fetchError]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})

                const nations = allNations.filter(n => onlinePlayers.find(op => op.name == n.king))
                fn.sortByKey(nations, 'king')
            
                let page = 1
                if (req.split(" ")[0]) page = parseInt(req.split(" ")[0])
                if (isNaN(page)) page = 0
                else page--
            
                const allData = nations.map(nation => `${nation.king} (${nation.name})`).join('\n').match(/(?:^.*$\n?){1,20}/mg)
                return await new CustomEmbed(client, "(Aurora) Online Activity | Kings")
                    .setPage(page)
                    .setColor(0x556b2f)
                    .paginate(allData, `Total: ${nations.length}` + "```", "```")
                    .editMessage(m)
            }
            default: return await m.edit({embeds: [new EmbedBuilder()
                .setColor(Colors.Red)
                .setTitle("Invalid Arguments")
                .setDescription("Arguments: `all`, `staff`, `mayors`, `kings`")
            ]}).then((m => setTimeout(() => m.delete(), 10000))).catch(() => {})
        }
    }
}