const { BaseHelper } = require("./base")

class NationHelper extends BaseHelper {
    constructor(client, isNova = false) {
        super(client, isNova)
        this.embed.setColor("ORANGE")
    }
}

module.exports = {
    NationHelper
}