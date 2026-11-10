import amqp from "amqplib";

export enum SimpleQueueType {
    Durable,
    Transient,
}

export async function declareAndBind(
    conn: amqp.ChannelModel,
    exchange: string,
    queueName: string,
    key: string,
    queueType: SimpleQueueType,
): Promise<[amqp.Channel, amqp.Replies.AssertQueue]> {
    const channel = await conn.createChannel();
    const options: amqp.Options.AssertQueue = {
        durable: queueType === SimpleQueueType.Durable,
        autoDelete: queueType === SimpleQueueType.Transient,
        exclusive: queueType === SimpleQueueType.Transient,
        arguments: { "x-dead-letter-exchange": "peril_dlx" },
    }
    const queue = await channel.assertQueue(queueName, options);
    const boundQueue = await channel.bindQueue(queueName, exchange, key);
    return [channel, queue];
}