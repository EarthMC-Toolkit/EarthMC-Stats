const Discord = require("discord.js"),
      { MojangLib } = require('earthmc'),
      database = require("../../bot/utils/database"),
      Queue = require("../../bot/objects/Queue"),
      fn = require("../../bot/utils/fn")

module.exports =  {
    name: "queue",
    description: "Get the current server queue.",
    /**
     * @param {Discord.Client} client 
     * @param {Discord.CommandInteraction} interaction 
     */
    run: async (client, interaction) => {
        await interaction.deferReply()

        const aurora = await database.Aurora.getOnlinePlayerData().catch(() => {}),
              nova = await database.Nova.getOnlinePlayerData().catch(() => {}),
              server = await MojangLib.servers.get("play.earthmc.net").catch(() => {})

        const queue = new Queue(server, aurora, nova)
        await queue.init()

        const totalMax = (queue.nova.config?.maxcount ?? 200) + (queue.aurora.config?.maxcount ?? 200)
        const embed = new Discord.MessageEmbed()
            .setTitle("Queue & Player Info")
            .addFields(
                fn.embedField("Players In Queue", queue.get()),
                fn.embedField("Total", `${queue.totalPlayers}/${totalMax}`),
                fn.embedField("Aurora", queue.aurora.formatted, true),
                fn.embedField("Nova", queue.nova.formatted, true),
                fn.embedField(client.user.avatarURL()),
                fn.embedField("GREEN")
            )

        await interaction.editReply({embeds: [embed]})
    }
}