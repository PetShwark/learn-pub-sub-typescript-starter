import amqp, { type ConfirmChannel } from "amqplib";

export async function publishJSON<T>(
    ch: ConfirmChannel,
    exchange: string,
    routingKey: string,
    value: T,
): Promise<void> {
    const jsonString = JSON.stringify(value);
    const buffer = Buffer.from(jsonString, "utf-8");
    const publist_result = ch.publish(exchange, routingKey, buffer, { contentType: "application/json" });
}
