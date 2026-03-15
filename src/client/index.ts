import amqp from "amqplib";
import {
  clientWelcome,
  getInput,
  commandStatus,
  printClientHelp,
  printQuit
} from "../internal/gamelogic/gamelogic.js";
import { GameState } from "../internal/gamelogic/gamestate.js";
import { commandSpawn } from "../internal/gamelogic/spawn.js";
import { commandMove } from "../internal/gamelogic/move.js";
import {
  declareAndBind,
  SimpleQueueType
} from "../internal/pubsub/declare_bind.js";
import {
  ExchangePerilDirect,
  PauseKey
} from "../internal/routing/routing.js";
import { subscribeJSON } from "../internal/pubsub/subscribe_json.js";
import { handlerPause } from "./handlers.js";


async function main() {
  const connectionString = "amqp://guest:guest@localhost:5672/";
  const connection = await amqp.connect(connectionString);
  console.log("Connected to RabbitMQ");
  const userName = await clientWelcome();
  const queueName = `${PauseKey}.${userName}`;
  const stuff = await declareAndBind(
    connection,
    ExchangePerilDirect,
    queueName,
    PauseKey,
    SimpleQueueType.Transient
  );
  const gameState = new GameState(userName);
  await subscribeJSON(
    connection,
    ExchangePerilDirect,
    queueName,
    PauseKey,
    SimpleQueueType.Transient,
    handlerPause(gameState)
  );
  // REPL loop
  while (true) {
    const userInput = await getInput();
    if (userInput.length > 0) {
      switch (userInput[0]) {
        case "spawn":
          commandSpawn(gameState, userInput);
          break;
        case "move":
          try {
            commandMove(gameState, userInput);
          }
          catch (error) {
            console.log("The game is paused.  You may not move.");
          };
          break;
        case "status":
          await commandStatus(gameState);
          break;
        case "help":
          printClientHelp();
          break;
        case "quit":
          printQuit();
          process.exit(0);
          break;
        case "spam":
          console.log("Spamming not allowed yet!.");
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
