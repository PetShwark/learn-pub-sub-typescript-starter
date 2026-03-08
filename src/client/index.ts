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
  const gameState = new GameState(userName);
  // REPL loop
  while (true) {
    const userInput = await getInput();
    if (userInput.length > 0) {
      switch (userInput[0]) {
        case "spawn":
          commandSpawn(gameState, userInput);
          break;
        case "move":
          commandMove(gameState, userInput);
          break;
        case "status":
          commandStatus(gameState);
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
