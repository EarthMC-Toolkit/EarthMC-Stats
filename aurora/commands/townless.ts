import { 
    Client, Message,
    EmbedBuilder,  Colors
} from "discord.js"

import * as fn from '../../bot/utils/fn.js'
import { Aurora } from 'earthmc'

export default {
    name: "townless",
    slashCommand: true,
    description: "Lists all online players without a town.",
    run: async (client: Client, message: Message, args: string[]) => {
        const req = args.join(" ")
        const m = await message.reply({embeds: [new EmbedBuilder()
            .setColor(Colors.DarkPurple)
            .setTitle("<a:loading:966778243615191110> Fetching townless players, this may take a moment.")
        ]})   
                
        const townlessPlayers = await Aurora.Players.townless().catch(() => null) 
        if (!townlessPlayers) return await m.edit({ embeds: [fn.fetchError] })
            .then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

        let page = 1    

        if (req.split(" ")[0]) page = parseInt(req.split(" ")[0])
        if (isNaN(page)) page = 0
        else page--

        const allData = townlessPlayers.map(player => player.name)
            .join('\n').match(/(?:^.*$\n?){1,10}/mg)
        
        const botembed = []
        let i = 0
            
        const len = allData.length
        const townlessPlayersLen = townlessPlayers.length

        const embed = new EmbedBuilder()
            .setTitle(`(Aurora) Townless Players [${townlessPlayersLen}]`)
            .setColor(Colors.DarkPurple)
            .setTimestamp()
            .setAuthor({ 
                name: message.author.username, 
                iconURL: message.author.displayAvatarURL() 
            })

        if (townlessPlayersLen < 1) {
            const noTownlessEmbed = embed.setDescription("There are currently no townless players!")
            return m.edit({ embeds: [noTownlessEmbed] })
        }
        else if (len <= 1) { // If only one page, don't create paginator.
            return m.edit({ embeds: [embed
                .setDescription("```" + townlessPlayers[0].name + "\n" + allData.toString() + "```")
            ]})
        }
        else { // More than one page, create paginator.
            for (; i < len; i++) {
                botembed[i] = embed.setDescription(
                    "```" + townlessPlayers[0].name + "\n" + allData[i] + "```"
                ).setFooter({ 
                    text: `Page ${i+1}/${len}`, 
                    iconURL: client.user.avatarURL() 
                })
            }

            await m.edit({ embeds: [botembed[page]] })
                .then(msg => fn.paginator(message.author.id, msg, botembed, page))
                .catch(err => console.log(err))
        }
    }
}