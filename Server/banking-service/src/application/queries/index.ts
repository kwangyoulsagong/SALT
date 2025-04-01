import { GetBankAccountsHandler } from './handlers/get-bank-accounts.handler';
import { GetBankAccountDetailsHandler } from './handlers/get-bank-account-details.handler';
import { GetTransactionsHandler } from './handlers/get-transactions.handler';

export const QueryHandlers = [
  GetBankAccountsHandler,
  GetBankAccountDetailsHandler,
  GetTransactionsHandler,
];
