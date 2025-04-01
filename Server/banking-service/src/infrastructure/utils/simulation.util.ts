import { BANKS } from '../constants/banks.constant';

export class SimulationUtil {
  // 0원으로 시작하는 계좌 생성
  static generateSimulatedAccounts(
    userId: string,
    userName: string,
    birthDate: string, // 'YYMMDD' 형식
    count = 1,
  ) {
    const shuffledBanks = [...BANKS].sort(() => Math.random() - 0.5);
    const selectedBanks = shuffledBanks.slice(0, count);

    return selectedBanks.map((bank) => ({
      userId,
      accountNumber: `${Math.floor(100000000 + Math.random() * 900000000)}`,
      accountName: `${bank.name} 입출금통장`,
      bankCode: bank.code,
      bankName: bank.name,
      accountHolderName: userName, // 실제 사용자 이름 사용
      fintechUseNum: `${bank.code}MOCK${Math.floor(Math.random() * 1000000000)}`,
      accountAlias: `${bank.name} 계좌`,
      balance: 0,
      availableAmount: 0,
      isActive: true,
      accountType: '1',
      accountState: '01',
      productName: '입출금통장',
      lastTransactionDate: '',
      birthDate: birthDate, // 생년월일 추가
    }));
  }
}
