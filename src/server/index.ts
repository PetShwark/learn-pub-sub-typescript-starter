import amqp from "amqplib";
import { publishJSON } from "../internal/pubsub/publish_json.js";
import { subscribeMsgPack } from "../internal/pubsub/subscribe_json.js";
import {
  ExchangePerilDirect,
  ExchangePerilTopic,
  PauseKey
} from "../internal/routing/routing.js";
import {
  printServerHelp,
  getInput
} from "../internal/gamelogic/gamelogic.js";
import {
  declareAndBind,
  SimpleQueueType
} from "../internal/pubsub/declare_bind.js";
import { writeLog, type GameLog } from "../internal/gamelogic/logs.js";


async function main() {
  const connectionString = "amqp://guest:guest@localhost:5672/";
  const connection = await amqp.connect(connectionString);
  console.log("Connected to RabbitMQ");

  const confirmChannel = await connection.createConfirmChannel();
  console.log("Confirm channel created");

  await subscribeMsgPack(
    connection,
    ExchangePerilTopic,
    "game_logs",
    "*",
    SimpleQueueType.Durable,
    async (gameLog) => {
      await writeLog(gameLog as GameLog);
      console.log("> ");
    }
  );

  // const gameLogsQueue = declareAndBind(
  //   connection,
  //   ExchangePerilTopic,
  //   "game_logs",
  //   "game_logs.*",
  //   SimpleQueueType.Durable
  // );

  process.on("SIGINT", async () => {
    console.log("Closing RabbitMQ connection...");
    await connection.close();
    process.exit(0);
  });

  while (true) {
    printServerHelp();
    // Used to run the server from a non-interactive source, like the multiserver.sh file
    if (!process.stdin.isTTY) {
      console.log("Non-interactive mode: skipping command input.");
      return;
    }
    const userInput = await getInput();
    if (userInput.length > 0) {
      switch (userInput[0]) {
        case "pause":
          await publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, { isPaused: true });
          console.log("Pause message published");
          break;
        case "resume":
          await publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, { isPaused: false });
          console.log("Resume message published");
          break;
        case "quit":
          console.log("Exiting.");
          process.exit(0);
          break;
        default:
          console.log(`Command ${userInput[0]} unknown.`);
          break;
      }
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
