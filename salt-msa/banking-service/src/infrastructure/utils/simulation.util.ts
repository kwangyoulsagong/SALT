import {
  TransactionType,
  InOutType,
} from '../../domain/entities/transaction.entity';
import {
  BANKS,
  TRANSACTION_TYPES,
  TransactionContents,
} from '../constants/banks.constant';

export class SimulationUtil {
  static generateDate(minusDays = 0): string {
    const date = new Date();
    date.setDate(date.getDate() - minusDays);
    return date.toISOString().slice(0, 10).replace(/-/g, '');
  }

  static generateTime(): string {
    return `${String(Math.floor(Math.random() * 24)).padStart(2, '0')}${String(
      Math.floor(Math.random() * 60),
    ).padStart(2, '0')}${String(Math.floor(Math.random() * 60)).padStart(
      2,
      '0',
    )}`;
  }

  static generateTransactionType(): TransactionType {
    const index = Math.floor(Math.random() * TRANSACTION_TYPES.length);
    return TRANSACTION_TYPES[index];
  }

  static generateTransactionContent(type: TransactionType): string {
    const contents: TransactionContents = {
      [TransactionType.ACCOUNT_TRANSFER]: [
        '홍길동',
        '김철수',
        '이영희',
        '박지민',
        '최현우',
      ].map((name) => `${name} 님께 이체`),
      [TransactionType.ATM_WITHDRAWAL]: ['ATM출금'],
      [TransactionType.ATM_DEPOSIT]: ['ATM입금'],
      [TransactionType.CARD_PAYMENT]: [
        '스타벅스',
        '이마트',
        '쿠팡',
        '넷플릭스',
        '배달의민족',
      ].map((store) => `${store} 결제`),
      [TransactionType.SALARY]: ['급여'],
      [TransactionType.UTILITIES]: ['전기요금', '수도요금', '가스요금'].map(
        (bill) => `${bill} 납부`,
      ),
      [TransactionType.AUTO_PAYMENT]: ['통신요금', '보험료', '카드대금'].map(
        (fee) => `${fee} 자동이체`,
      ),
    };

    const contentList = contents[type];
    return contentList[Math.floor(Math.random() * contentList.length)];
  }

  static isDebitTransaction(type: TransactionType): boolean {
    return [
      TransactionType.ATM_WITHDRAWAL,
      TransactionType.CARD_PAYMENT,
      TransactionType.UTILITIES,
      TransactionType.AUTO_PAYMENT,
    ].includes(type);
  }

  static generateSimulatedAccounts(userId: string, count = 3) {
    const shuffledBanks = [...BANKS].sort(() => Math.random() - 0.5);
    const selectedBanks = shuffledBanks.slice(0, count);

    return selectedBanks.map((bank) => ({
      userId,
      accountNumber: `${Math.floor(100000000 + Math.random() * 900000000)}`,
      accountName: `${bank.name} 입출금통장`,
      bankCode: bank.code,
      bankName: bank.name,
      accountHolderName: '홍길동',
      fintechUseNum: `${bank.code}MOCK${Math.floor(Math.random() * 1000000000)}`,
      accountAlias: `${bank.name} 계좌`,
      balance: Math.floor(1000000 + Math.random() * 9000000),
      availableAmount: 0, // Will be calculated later
      isActive: true,
      accountType: '1',
      accountState: '01',
      productName: '입출금통장',
      lastTransactionDate: this.generateDate(1),
    }));
  }

  static generateSimulatedTransactions(
    bankAccountId: string,
    accountBalance: number,
    count = 20,
  ) {
    let balance = accountBalance;

    return Array(count)
      .fill(null)
      .map((_, i) => {
        const type = this.generateTransactionType();
        const isDebit = this.isDebitTransaction(type);
        const amount = Math.floor(10000 + Math.random() * 990000);

        const beforeBalance = balance;

        if (isDebit) {
          balance -= amount;
        } else {
          balance += amount;
        }

        return {
          bankAccountId,
          tranType: type,
          inoutType: isDebit ? InOutType.OUT : InOutType.IN,
          tranAmount: amount,
          afterBalanceAmount: isDebit
            ? beforeBalance - amount
            : beforeBalance + amount,
          printContent: this.generateTransactionContent(type),
          branchName: '인터넷뱅킹',
          tranDate: this.generateDate(i),
          tranTime: this.generateTime(),
        };
      })
      .reverse(); // Most recent transactions first
  }
}
