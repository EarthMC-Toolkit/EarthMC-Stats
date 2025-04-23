import type { Prettify } from 'earthmc'

import {
    type Message,
    type Collection,
    EmbedBuilder,
    PermissionFlagsBits,
    Colors, ChannelType
} from 'discord.js'

import type { 
    DJSEvent, MessageCommand,
    CustomClientData, ExtendedClient
} from '../types.js'

const { SendMessages, EmbedLinks } = PermissionFlagsBits
const requiredPerms = [SendMessages, EmbedLinks]

type CommandsKey = Prettify<keyof CustomClientData>

async function runCmd(msg: Message, sliceAmt: number, cmdsKey: CommandsKey) {	
    const args = msg.content.slice(sliceAmt).split(/\s+/u)
    
    const commandName = args.shift().toLowerCase()
    const commands = (msg.client as ExtendedClient)[cmdsKey] as Collection<string, MessageCommand>

    const command = commands.get(commandName) || commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName))
    if (!command) {
        console.warn(`[${msg.author.displayName}] Could not find command '${commandName}'. Likely for another bot.`)
        return
    }
    
    const channel = msg.channel
    if (channel.type == ChannelType.GuildText) {
        const missingPerms: string[] = []
        const requiredPermsLen = requiredPerms.length
        
        for (let i = 0; i < requiredPermsLen; i++) {
            const curPerm = requiredPerms[i]
            if (!channel.permissionsFor(msg.guild.members.me).has(curPerm)) {
                missingPerms.push(curPerm.toString())
            }
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

const prefix = (message: Message, str: string) => message.content.startsWith(str)

const msgCreate: DJSEvent = {
    name: 'messageCreate',
    async execute(message: Message) {
        if (message.author.bot) return
        if (prefix(message, "/")) return runCmd(message, 1, 'commands')
    }
}

export default msgCreate