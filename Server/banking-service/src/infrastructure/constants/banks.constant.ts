export type Bank = {
  code: string;
  name: string;
};

export const BANKS: Bank[] = [
  { code: '088', name: '신한은행' },
  { code: '081', name: '하나은행' },
  { code: '004', name: 'KB국민은행' },
  { code: '003', name: 'IBK기업은행' },
  { code: '011', name: 'NH농협은행' },
  { code: '020', name: '우리은행' },
];

export enum TransactionType {
  ACCOUNT_TRANSFER = '계좌이체',
  ATM_WITHDRAWAL = 'ATM출금',
  ATM_DEPOSIT = 'ATM입금',
  CARD_PAYMENT = '카드결제',
  SALARY = '급여',
  UTILITIES = '공과금',
  AUTO_PAYMENT = '자동이체',
}

export const TRANSACTION_TYPES = [
  TransactionType.ACCOUNT_TRANSFER,
  TransactionType.ATM_WITHDRAWAL,
  TransactionType.ATM_DEPOSIT,
  TransactionType.CARD_PAYMENT,
  TransactionType.SALARY,
  TransactionType.UTILITIES,
  TransactionType.AUTO_PAYMENT,
];

export type TransactionContents = {
  [K in TransactionType]: string[];
};
