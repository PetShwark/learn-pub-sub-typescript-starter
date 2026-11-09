import { GameState, type PlayingState } from "../internal/gamelogic/gamestate.js";
import { handlePause } from "../internal/gamelogic/pause.js";
import { handleMove, MoveOutcome } from "../internal/gamelogic/move.js";
import type { ArmyMove } from "../internal/gamelogic/gamedata.js";
import type { acktype } from "../internal/pubsub/subscribe_json.js";

export function handlerPause(gs: GameState): (ps: PlayingState) => acktype {
    return (ps) => {
        handlePause(gs, ps);
        console.log("> ");
        return "Ack";
    };
}

export function handlerMove(gs: GameState): (am: ArmyMove) => acktype {
    return (am) => {
        const outcome = handleMove(gs, am);
        var resultAckType: acktype;
        switch (outcome) {
            case MoveOutcome.Safe:
            case MoveOutcome.MakeWar:
                resultAckType = "Ack";
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