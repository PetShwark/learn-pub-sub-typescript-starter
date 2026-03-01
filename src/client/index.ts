import amqp from "amqplib";
import { clientWelcome } from "../internal/gamelogic/gamelogic.js";
import { declareAndBind, SimpleQueueType } from "../internal/pubsub/declare_bind.js";
import { ExchangePerilDirect, PauseKey } from "../internal/routing/routing.js";


async function main() {
  const connectionString = "amqp://guest:guest@localhost:5672/";
  const connection = await amqp.connect(connectionString);
  console.log("Connected to RabbitMQ");
  const userName = await clientWelcome();
  const stuff = declareAndBind(
    connection,
    ExchangePerilDirect,
    `${PauseKey}.${userName}`,
    PauseKey,
    SimpleQueueType.Transient
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
