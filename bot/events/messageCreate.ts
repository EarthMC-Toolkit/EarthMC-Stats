import Discord from 'discord.js'

import * as fn from '../utils/fn.js'
import { sendNews } from '../utils/api.js'

const { SendMessages, EmbedLinks } = Discord.PermissionFlagsBits
const requiredPerms = [SendMessages, EmbedLinks]

async function runCmd(msg: Discord.Message, sliceAmt: number, commands) {	
    const args = msg.content.slice(sliceAmt).split(/\s+/u)

    const commandName = args.shift().toLowerCase(),
          command = commands.get(commandName) || commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName))

    if (!command) return console.log(`Could not find command '${commandName}'`)
    
    const channel = msg.channel
    if (channel.type == Discord.ChannelType.GuildText) {
        const missingPerms = []
        const requiredPermsLen = requiredPerms.length
        
        for (let i = 0; i < requiredPermsLen; i++) {
            const curPerm = requiredPerms[i]
            if (!channel.permissionsFor(msg.guild.members.me).has(curPerm))
                missingPerms.push(curPerm.toString())
        }
        
        const missingPermsLen = missingPerms.length
        if (missingPermsLen > 0) return msg.author.send({embeds: [new Discord.EmbedBuilder()
            .setTimestamp()
            .setColor(Discord.Colors.DarkGold)
            .setDescription(`**I don't have the required permissions in <#${msg.channel.id}>!**\n\n
                Missing permission${missingPermsLen == 1 ? "" : "s"}: ${missingPerms.join(", ")}`)
        ]})
    }
    
    await command.run(msg.client, msg, args).catch(console.log)
}

export default {
    name: 'messageCreate',
    async execute(message: Discord.Message) {
        if (message.author.id == '970963659109060640') {
            const mapName = message.channel.id == fn.NOVA.newsChannel ? 
                 'nova' : message.channel.id == fn.AURORA.newsChannel ? 'aurora' : null
                
            if (mapName) return sendNews(message.client, mapName)
        }
    
        if (message.author.bot) return

        if (message.content.startsWith("/")) {
            await runCmd(message, 1, message.client['auroraCommands'])
        }
        if (message.content.startsWith("a/")) await runCmd(message, 2, message.client['auroraCommands'])
        if (message.content.startsWith("n/")) await runCmd(message, 2, message.client['novaCommands'])
    }
}