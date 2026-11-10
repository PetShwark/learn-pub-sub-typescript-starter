import amqp, { type ConfirmChannel } from "amqplib";
import { encode } from "@msgpack/msgpack";

export async function publishMsgPack<T>(
    ch: ConfirmChannel,
    exchange: string,
    routingKey: string,
    value: T,
): Promise<void> {
    const valueEncoded = encode(value);
    const encodedBuffer = Buffer.from(valueEncoded);
    const publish_result = ch.publish(
        exchange,
        routingKey,
        encodedBuffer,
        { contentType: "application/x-msgpack" }
    );
}

export async function publishJSON<T>(
    ch: ConfirmChannel,
    exchange: string,
    routingKey: string,
    value: T,
): Promise<void> {
    const jsonString = JSON.stringify(value);
    const buffer = Buffer.from(jsonString, "utf-8");
    const publist_result = ch.publish(
        exchange,
        routingKey,
        buffer,
        { contentType: "application/json" }
    );
}
