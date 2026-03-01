import amqp from "amqplib";
import { publishJSON } from "../internal/pubsub/publish_json.js";
import { ExchangePerilDirect, PauseKey } from "../internal/routing/routing.js";
import { type PlayingState } from "../internal/gamelogic/gamestate.js";

async function main() {
  const connectionString = "amqp://guest:guest@localhost:5672/";
  const connection = await amqp.connect(connectionString);
  console.log("Connected to RabbitMQ");

  const confirmChannel = await connection.createConfirmChannel();
  console.log("Confirm channel created");

  const playingState: PlayingState = {
    isPaused: true,
  };
  await publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, playingState);
  console.log("Message published");

  process.on("SIGINT", async () => {
    console.log("Closing RabbitMQ connection...");
    await connection.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
