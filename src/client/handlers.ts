import type { ConfirmChannel } from "amqplib";
import { GameState, type PlayingState } from "../internal/gamelogic/gamestate.js";
import { handlePause } from "../internal/gamelogic/pause.js";
import { handleMove, MoveOutcome } from "../internal/gamelogic/move.js";
import type { ArmyMove, RecognitionOfWar } from "../internal/gamelogic/gamedata.js";
import type { acktype } from "../internal/pubsub/subscribe_json.js";
import { publishJSON } from "../internal/pubsub/publish_json.js";
import { ArmyMovesPrefix, ExchangePerilTopic } from "../internal/routing/routing.js";
import { WarRecognitionsPrefix } from "../internal/routing/routing.js";
import { handleWar, WarOutcome, type WarResolution } from "../internal/gamelogic/war.js";
import { errorLog } from "./index.js";

export function handlerPause(gs: GameState): (ps: PlayingState) => acktype {
    return (ps) => {
        handlePause(gs, ps);
        console.log("> ");
        return "Ack";
    };
}

export function handlerMove(gs: GameState, cc: ConfirmChannel): (am: ArmyMove) => acktype {
    return (am) => {
        const outcome = handleMove(gs, am);
        var resultAckType: acktype;
        switch (outcome) {
            case MoveOutcome.Safe:
                resultAckType = "Ack";
                break;
            case MoveOutcome.MakeWar:
                const rw: RecognitionOfWar = {
                    attacker: am.player,
                    defender: gs.getPlayerSnap(),
                };
                try {
                    publishJSON(
                        cc,
                        ExchangePerilTopic,
                        `${WarRecognitionsPrefix}.${am.player.username}`,
                        rw
                    );
                    resultAckType = "Ack";
                } catch (error) {
                    errorLog(error);
                    resultAckType = "NackRequeue";
                }
                break;
            case MoveOutcome.SamePlayer:
                resultAckType = "NackDiscard";
                break;
            default:
                resultAckType = "NackDiscard";
                break;
        }
        console.log("> ");
        return resultAckType;
    };
}


export function handlerWarMessages(gs: GameState): (rw: RecognitionOfWar) => acktype {
    return (rw) => {
        const warResolution = handleWar(gs, rw);
        var resultAckType: acktype;
        switch (warResolution.result) {
            case WarOutcome.YouWon:
                resultAckType = "Ack";
                break;
            case WarOutcome.Draw:
                resultAckType = "Ack";
                break;
            case WarOutcome.NoUnits:
                resultAckType = "NackDiscard";
                break;
            case WarOutcome.NotInvolved:
                resultAckType = "NackRequeue";
                break;
            case WarOutcome.OpponentWon:
                resultAckType = "Ack";
                break;
        }
        process.stdout.write("> ");
        return resultAckType;
    }
}