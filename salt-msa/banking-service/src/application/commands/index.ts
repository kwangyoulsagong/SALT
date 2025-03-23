import { AddSimulatedAccountHandler } from './handlers/add-simulated-account.handler';
import { UpdateAccountHandler } from './handlers/update-account.handler';
import { DepositHandler } from './handlers/deposit.handler';
import { WithdrawHandler } from './handlers/withdraw.handler';

export const CommandHandlers = [
  AddSimulatedAccountHandler,
  UpdateAccountHandler,
  DepositHandler,
  WithdrawHandler,
];
