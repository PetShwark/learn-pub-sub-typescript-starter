import amqp from "amqplib";
import {
  clientWelcome,
  getInput,
  commandStatus,
  printClientHelp,
  printQuit
} from "../internal/gamelogic/gamelogic.js";
import { GameState } from "../internal/gamelogic/gamestate.js";
import { type ArmyMove } from "../internal/gamelogic/gamedata.js";
import { commandSpawn } from "../internal/gamelogic/spawn.js";
import { commandMove } from "../internal/gamelogic/move.js";
import {
  declareAndBind,
  SimpleQueueType
} from "../internal/pubsub/declare_bind.js";
import {
  ArmyMovesPrefix,
  ExchangePerilDirect,
  ExchangePerilTopic,
  PauseKey,
  WarRecognitionsPrefix
} from "../internal/routing/routing.js";
import { subscribeJSON } from "../internal/pubsub/subscribe_json.js";
import { handlerMove, handlerPause, handlerWarMessages } from "./handlers.js";
import { publishJSON } from "../internal/pubsub/publish_json.js";
import { handleWar } from "../internal/gamelogic/war.js";

export function errorLog(error: unknown): void {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("Unknown error:", String(error));
  }
}

async function main() {
  const connectionString = "amqp://guest:guest@localhost:5672/";
  const connection = await amqp.connect(connectionString);
  console.log("Connected to RabbitMQ");
  const channel = await connection.createConfirmChannel();
  console.log("Confirm channel created.");
  const userName = await clientWelcome();
  const queueName = `${PauseKey}.${userName}`;
  const armyMovesQueueName = `army_moves.${userName}`;
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
  await subscribeJSON(
    connection,
    ExchangePerilTopic,
    armyMovesQueueName,
    `${ArmyMovesPrefix}.*`,
    SimpleQueueType.Transient,
    handlerMove(gameState, channel)
  );
  await subscribeJSON(
    connection,
    ExchangePerilTopic,
    `${WarRecognitionsPrefix}`,
    `${WarRecognitionsPrefix}.*`,
    SimpleQueueType.Durable,
    handlerWarMessages(gameState)
  )
  // REPL loop
  while (true) {
    const userInput = await getInput();
    if (userInput.length > 0) {
      switch (userInput[0]) {
        case "spawn":
          try {
            commandSpawn(gameState, userInput);
          } catch (error) {
            errorLog(error);
          }
          break;
        case "move":
          try {
            const armyMove = commandMove(gameState, userInput);
            await publishJSON(channel, ExchangePerilTopic, armyMovesQueueName, armyMove);
          }
          catch (error) {
            errorLog(error);
          }
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
