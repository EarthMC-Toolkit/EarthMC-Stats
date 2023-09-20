class News {
    id = 0
    message = ""
    images = []

    constructor(msg) {    
        this.id = msg.id
        this.message = msg.content
        this.timestamp = msg.createdTimestamp

        const imageRegex = new RegExp("(https?:\/\/.*.(?:png|jpg|jpeg|gif))", "g")
        if (imageRegex.test(msg.content)) {
            this.message = msg.content.replaceAll(imageRegex, "")
            this.images = msg.content.match(imageRegex)
        }
    }
}

module.exports = News