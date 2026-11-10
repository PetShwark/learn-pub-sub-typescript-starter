import amqp from "amqplib";
import { type SimpleQueueType, declareAndBind } from "./declare_bind.js";

export type acktype = "Ack" | "NackRequeue" | "NackDiscard";

export async function subscribeJSON<T>(
    conn: amqp.ChannelModel,
    exchange: string,
    queueName: string,
    key: string,
    queueType: SimpleQueueType,
    handler: (data: T) => Promise<acktype> | acktype,
): Promise<void> {
    const [channel, assertQueue] = await declareAndBind(conn, exchange, queueName, key, queueType);
    await channel.consume(assertQueue.queue, async (msg) => {
        if (msg !== null) {
            const ack = await handler(JSON.parse(msg.content.toString()));
            switch (ack) {
                case "Ack":
                    channel.ack(msg);
                    console.log(`Message acked.`);
                    break;
                case "NackDiscard":
                    channel.nack(msg, false, false);
                    console.log(`Message nacked and discarded.`);
                    break;
                case "NackRequeue":
                    console.log(`Message nacked and requeued.`);
                    channel.nack(msg, false, true);
                    break;
            }
        }
    });
}