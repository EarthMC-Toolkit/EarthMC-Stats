const Discord = require("discord.js"),
      { MojangLib } = require('earthmc'),
      fn = require('../../bot/utils/fn'),
      database = require("../../bot/utils/database")
      
module.exports = {
    name: "status",
    description: "Displays the current server status.",
    /**
     * @param { Discord.Client } client
     * @param { Discord.CommandInteraction } interaction 
     */
    run: async (client, interaction) => {
        await interaction.deferReply()

        const embed = new Discord.MessageEmbed()
            .setTitle("EarthMC Status Overview")
            .setColor("GREEN")
            .setThumbnail("https://cdn.discordapp.com/attachments/586135349978333194/672542598354698273/emclogo.png")
            .setFooter(fn.devsFooter(client))
            .setTimestamp()

        const serverData = await MojangLib.servers.get("play.earthmc.net").catch(() => {}),
              auroraData = await database.Aurora.getTownyData().catch(() => {}),
              novaData = await database.Nova.getTownyData().catch(() => {})

        if (serverData && (!auroraData && !novaData))
            embed.setDescription("The server seems to be up, but dynmap is unavailable!")
        
        embed.addFields(
            fn.embedField("Server", `${status(serverData)}`),
            fn.embedField("Aurora", `${status(auroraData)}`),
            fn.embedField("Nova", `${status(novaData)}`)
        )

        await interaction.editReply({embeds: [embed]})
    }
}

function status(data) {
    return !data ? "Offline :red_circle:" : "Online :green_circle:"
}