const { BaseHelper } = require("./base")

class TownHelper extends BaseHelper {
    constructor(client, isNova = false) {
        super(client, isNova)
        this.embed.setColor("ORANGE")
    }
}

module.exports = {
    TownHelper
}