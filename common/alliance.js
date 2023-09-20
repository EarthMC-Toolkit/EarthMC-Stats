const { BaseHelper } = require("./base")

class AllianceHelper extends BaseHelper {
    constructor(client, isNova = false) {
        super(client, isNova)
        this.embed.setColor("DARK_BLUE")
    }
}

module.exports = {
    AllianceHelper
}