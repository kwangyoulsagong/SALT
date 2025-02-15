// 타입 정의
type Bank = {
  code: string;
  name: string;
};

type TransactionType =
  | "계좌이체"
  | "ATM출금"
  | "ATM입금"
  | "카드결제"
  | "급여"
  | "공과금"
  | "자동이체";

// 상수 정의
const TRANSACTION_TYPES: TransactionType[] = [
  "계좌이체",
  "ATM출금",
  "ATM입금",
  "카드결제",
  "급여",
  "공과금",
  "자동이체",
] as const;
type TransactionContents = {
  [K in TransactionType]: string[];
};
type Account = {
  fintech_use_num: string;
  account_alias: string;
  bank_code_std: string;
  bank_code_sub: string;
  bank_name: string;
  account_num: string;
  account_holder_name: string;
  account_type: string;
  inquiry_agree_yn: string;
  inquiry_agree_dtime: string;
  transfer_agree_yn: string;
  transfer_agree_dtime: string;
  account_state: string;
};

// 은행 정보 상수
export const BANKS: Bank[] = [
  { code: "088", name: "신한은행" },
  { code: "081", name: "하나은행" },
  { code: "004", name: "KB국민은행" },
  { code: "003", name: "IBK기업은행" },
  { code: "011", name: "NH농협은행" },
  { code: "020", name: "우리은행" },
];

// 유틸리티 함수들
export const utils = {
  generateDate(minusDays = 0) {
    const date = new Date();
    date.setDate(date.getDate() - minusDays);
    return date.toISOString().slice(0, 10).replace(/-/g, "");
  },

  generateTime() {
    return `${String(Math.floor(Math.random() * 24)).padStart(2, "0")}${String(
      Math.floor(Math.random() * 60)
    ).padStart(2, "0")}${String(Math.floor(Math.random() * 60)).padStart(
      2,
      "0"
    )}`;
  },

  generateTransactionType(): TransactionType {
    const index = Math.floor(Math.random() * TRANSACTION_TYPES.length);
    const type = TRANSACTION_TYPES[index];
    if (!type) {
      throw new Error("Invalid transaction type index");
    }
    return type;
  },

  generateTransactionContent(type: TransactionType) {
    const contents: TransactionContents = {
      계좌이체: ["홍길동", "김철수", "이영희", "박지민", "최현우"].map(
        (name) => `${name} 님께 이체`
      ),
      ATM출금: ["ATM출금"],
      ATM입금: ["ATM입금"],
      카드결제: ["스타벅스", "이마트", "쿠팡", "넷플릭스", "배달의민족"].map(
        (store) => `${store} 결제`
      ),
      급여: ["급여"],
      공과금: ["전기요금", "수도요금", "가스요금"].map(
        (bill) => `${bill} 납부`
      ),
      자동이체: ["통신요금", "보험료", "카드대금"].map(
        (fee) => `${fee} 자동이체`
      ),
    };
    return contents[type][Math.floor(Math.random() * contents[type].length)];
  },
};

// 계좌 생성 헬퍼 함수
const generateAccounts = (userSeqNo: string): Account[] => {
  const numAccounts = 4 + Math.floor(Math.random() * 3);
  const shuffledBanks = [...BANKS].sort(() => Math.random() - 0.5);
  const selectedBanks = shuffledBanks.slice(0, numAccounts);

  return selectedBanks.map((bank) => ({
    fintech_use_num: `${bank.code}MOCK${Math.floor(
      Math.random() * 1000000000
    )}`,
    account_alias: `${bank.name} 계좌`,
    bank_code_std: bank.code,
    bank_code_sub: "000",
    bank_name: bank.name,
    account_num: `${Math.floor(100000000 + Math.random() * 900000000)}`,
    account_holder_name: "홍길동",
    account_type: "1",
    inquiry_agree_yn: "Y",
    inquiry_agree_dtime: "20240215114600",
    transfer_agree_yn: "Y",
    transfer_agree_dtime: "20240215114600",
    account_state: "01",
  }));
};

// 응답 생성 함수들
export const openBankingResponses = {
  generateAuthResponse: () => ({
    code: "CF-00000",
    message: "성공",
    access_token: `mock_access_token_${Date.now()}`,
    token_type: "Bearer",
    expires_in: 7200,
    refresh_token: `mock_refresh_token_${Date.now()}`,
    refresh_token_expires_in: 7200,
    scope: "inquiry transfer",
    user_seq_no: `USER${Math.floor(Math.random() * 1000000)}`,
  }),

  generateAccountList: (userSeqNo: string) => {
    const accounts = generateAccounts(userSeqNo);
    return {
      api_tran_id: `${Date.now()}`,
      api_tran_dtm: `${utils.generateDate()}${utils.generateTime()}`,
      rsp_code: "A0000",
      rsp_message: "성공",
      user_name: "홍길동",
      res_cnt: accounts.length,
      account_list: accounts,
    };
  },

  generateAccountDetail: (fintech_use_num: string) => {
    const balance = Math.floor(1000000 + Math.random() * 9000000);
    return {
      api_tran_id: `${Date.now()}`,
      api_tran_dtm: `${utils.generateDate()}${utils.generateTime()}`,
      rsp_code: "A0000",
      rsp_message: "성공",
      bank_tran_id: `M${Date.now()}`,
      bank_tran_date: utils.generateDate(),
      bank_code_tran: fintech_use_num.slice(0, 3),
      bank_rsp_code: "000",
      bank_rsp_message: "성공",
      fintech_use_num,
      balance_amt: balance,
      available_amt: balance * 0.95,
      account_type: "1",
      product_name: "입출금통장",
      account_issue_date: "20200101",
      maturity_date: "",
      last_tran_date: utils.generateDate(1),
    };
  },

  generateTransactionHistory: (fintech_use_num: string) => {
    let balance = Math.floor(1000000 + Math.random() * 9000000);
    const transactions = Array(20)
      .fill(null)
      .map((_, i) => {
        const type = utils.generateTransactionType();
        const isDebit = ["ATM출금", "카드결제", "공과금", "자동이체"].includes(
          type
        );
        const amount = Math.floor(10000 + Math.random() * 990000);

        if (isDebit) {
          balance += amount;
        } else {
          balance -= amount;
        }

        return {
          tran_date: utils.generateDate(i),
          tran_time: utils.generateTime(),
          inout_type: isDebit ? "출금" : "입금",
          tran_type: type,
          print_content: utils.generateTransactionContent(type),
          tran_amt: amount,
          after_balance_amt: balance,
          branch_name: "인터넷뱅킹",
        };
      })
      .reverse();

    return {
      api_tran_id: `${Date.now()}`,
      api_tran_dtm: `${utils.generateDate()}${utils.generateTime()}`,
      rsp_code: "A0000",
      rsp_message: "성공",
      bank_tran_id: `M${Date.now()}`,
      bank_tran_date: utils.generateDate(),
      bank_code_tran: fintech_use_num.slice(0, 3),
      bank_rsp_code: "000",
      bank_rsp_message: "성공",
      fintech_use_num,
      page_record_cnt: transactions.length,
      next_page_yn: "N",
      transaction_list: transactions,
    };
  },
};
