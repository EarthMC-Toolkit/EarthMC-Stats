import {
    type Message,
    type Collection,
    EmbedBuilder,
    PermissionFlagsBits,
    Colors, ChannelType
} from 'discord.js'

import { AURORA, NOVA } from '../utils/fn.js'
import { sendNews } from '../utils/api.js'
import type { MessageCommand } from '../types.js'

const { SendMessages, EmbedLinks } = PermissionFlagsBits
const requiredPerms = [SendMessages, EmbedLinks]

async function runCmd(msg: Message, sliceAmt: number, cmdsKey: string) {	
    const args = msg.content.slice(sliceAmt).split(/\s+/u)
    
    const commandName = args.shift().toLowerCase()
    const commands = (msg.client as any)[cmdsKey] as Collection<string, MessageCommand>

    const command = commands.get(commandName) || commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName))
    if (!command) return console.log(`Could not find command '${commandName}'`)
    
    const channel = msg.channel
    if (channel.type == ChannelType.GuildText) {
        const missingPerms = []
        const requiredPermsLen = requiredPerms.length
        
        for (let i = 0; i < requiredPermsLen; i++) {
            const curPerm = requiredPerms[i]
            if (!channel.permissionsFor(msg.guild.members.me).has(curPerm))
                missingPerms.push(curPerm.toString())
        }
        
        const missingPermsLen = missingPerms.length
        if (missingPermsLen > 0) return msg.author.send({embeds: [new EmbedBuilder()
            .setTimestamp()
            .setColor(Colors.DarkGold)
            .setDescription(`
                **I don't have the required permissions in <#${msg.channel.id}>!**\n\n
                Missing permission${missingPermsLen == 1 ? "" : "s"}: ${missingPerms.join(", ")}
            `)
        ]})
    }
    
    await command.run(msg.client, msg, args).catch(console.log)
}

const prefix = (message: Message, str: string) => 
    message.content.startsWith(str)

export default {
    name: 'messageCreate',
    async execute(message: Message) {
        if (message.author.id == '970963659109060640') {
            const channelID = message.channel.id
            const mapName = 
                channelID == NOVA.newsChannel ? 'nova' : 
                channelID == AURORA.newsChannel ? 'aurora' : null
                
            if (mapName) return sendNews(message.client, mapName)
        }
    
        if (message.author.bot) return

        if (prefix(message, "/")) 
            return runCmd(message, 1, 'auroraCommands')

        if (prefix(message, "a/"))
            return runCmd(message, 2, 'auroraCommands')

        if (prefix(message, "n/")) 
            return runCmd(message, 2, 'novaCommands')
    }
}