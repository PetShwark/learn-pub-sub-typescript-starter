import amqp from "amqplib";
import { type SimpleQueueType, declareAndBind } from "./declare_bind.js";

export async function subscribeJSON<T>(
    conn: amqp.ChannelModel,
    exchange: string,
    queueName: string,
    key: string,
    queueType: SimpleQueueType,
    handler: (data: T) => void,
): Promise<void> {
    const [channel, assertQueue] = await declareAndBind(conn, exchange, queueName, key, queueType);
    await channel.consume(assertQueue.queue, (msg) => {
        if (msg !== null) {
            handler(JSON.parse(msg.content.toString()));
            channel.ack(msg);
        }
    });
}