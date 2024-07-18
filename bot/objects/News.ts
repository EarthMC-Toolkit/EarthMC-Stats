import type { Message } from 'discord.js'

export default class News {
    id: string
    message = ""
    images: RegExpMatchArray = null
    
    timestamp: number

    constructor(msg: Message) {    
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