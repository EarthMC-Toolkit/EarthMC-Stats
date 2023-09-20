const fn = require('../bot/utils/fn'),
      Discord = require('discord.js')

class BaseHelper {
    client = null
    isNova = false

    embed = new Discord.MessageEmbed()

    /**
     * @param { Discord.Client } client 
     * @param { boolean } isNova 
     */
    constructor(client, isNova) {
        this.embed.setFooter(fn.devsFooter(client)).setTimestamp()
        this.isNova = isNova
    }
}

const field = fn.embedField
module.exports = {
    BaseHelper,
    field
}