import type { Message } from 'discord.js'

const IMAGE_MATCHER = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s]*)?)/g

export default class News {
    id: string
    message = ""
    headline = ""
    images: string[] = []
    timestamp: number

    constructor(msg: Message) {    
        this.id = msg.id
        this.message = msg.content
        this.timestamp = msg.createdTimestamp

        // Ensure TBI logo is gone.
        let headline: string = this.message
            .replaceAll("<:TBI:1071887302676185241>", "")
            .replaceAll("\u003C:TBI:1071887302676185241\u003E", "")

        // Content has at least one image link.
        if (IMAGE_MATCHER.test(msg.content)) {
            this.images = msg.content.match(IMAGE_MATCHER)
            headline = headline.replaceAll(IMAGE_MATCHER, "").trim() // Take all images out of the headline.
        }

        // Check if there are attachments in the message.
        if (msg.attachments.size > 0) {
            msg.attachments.each(attachment => {
                if (attachment.url.match(IMAGE_MATCHER)) {
                    this.images.push(attachment.url)
                }
            })
        }

        // The headline is everything in bold (between first set of **), or before first new line.
        this.headline = headline.match(/\*\*(.*?)\*\*/)?.[1] || headline.split('\n')[0]
    }
}