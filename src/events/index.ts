import { EventEmitter } from 'events';

import { UpdateFundBalanceListener } from './UpdateFundBalance';
import { SendMoneyMovementInstructionsListener } from './SendMoneyMovementInstructions';
import { CreateRebalanceDetails } from './CreateRebalanceDetails';

export enum EVENTS {
    CREATE_REBALANCE_DETIALS = 'CREATE_REBALANCE_DETIALS',
    UPDATE_FUND_BALANCE = 'UPDATE_FUND_BALANCE',
    SEND_MONEY_MOVEMENT_INSTRUCTIONS = 'SEND_MONEY_MOVEMENT_INSTRUCTIONS'
}

export const eventEmitter = new EventEmitter();

export function setupEventListeners() {
    eventEmitter.on(EVENTS.UPDATE_FUND_BALANCE, UpdateFundBalanceListener);
    eventEmitter.on(EVENTS.SEND_MONEY_MOVEMENT_INSTRUCTIONS, SendMoneyMovementInstructionsListener);
    eventEmitter.on(EVENTS.CREATE_REBALANCE_DETIALS, CreateRebalanceDetails);
    console.log('Setup Event Listeners');
}
