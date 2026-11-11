import amqp from "amqplib";
import {
  clientWelcome,
  getInput,
  commandStatus,
  printClientHelp,
  printQuit
} from "../internal/gamelogic/gamelogic.js";
import { type GameLog } from "../internal/gamelogic/logs.js";
import { GameState } from "../internal/gamelogic/gamestate.js";
import { getMaliciousLog } from "../internal/gamelogic/gamelogic.js";
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
  WarRecognitionsPrefix,
  GameLogSlug
} from "../internal/routing/routing.js";
import { subscribeJSON } from "../internal/pubsub/subscribe_json.js";
import { handlerMove, handlerPause, handlerWarMessages } from "./handlers.js";
import { publishJSON, publishMsgPack } from "../internal/pubsub/publish_json.js";

export function errorLog(error: unknown): void {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("Unknown error:", String(error));
  }
}

export function publishGameLog(
  ch: amqp.ConfirmChannel,
  userName: string,
  message: string
): void {
  const log: GameLog = {
    username: userName,
    message: message,
    currentTime: new Date()
  }
  publishMsgPack(
    ch,
    ExchangePerilTopic,
    `${GameLogSlug}.${userName}`,
    log
  );
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
    handlerWarMessages(gameState, channel)
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
          let errorMsg = "'spam' command requires a single non-zero, positive integer parameter.";
          if (userInput.length == 2) {
            const spamCount = parseInt(userInput[1] ?? "");
            if (Number.isNaN(spamCount)) {
              console.log(errorMsg);
            } else if (spamCount <= 0) {
              console.log(errorMsg);
            } else {
              for (let i = 0; i < spamCount; i++) {
                const maliciousLog = getMaliciousLog();
                const gameLog: GameLog = {
                  message: maliciousLog,
                  currentTime: new Date(),
                  username: userName
                }
                await publishMsgPack(
                  channel,
                  ExchangePerilTopic,
                  `game_logs.${userName}`,
                  gameLog);
              }
            }
          } else {
            console.log(errorMsg);
          }
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
