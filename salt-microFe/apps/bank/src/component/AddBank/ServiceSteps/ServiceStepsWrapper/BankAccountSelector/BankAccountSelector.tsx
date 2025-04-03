import { H3 } from "@repo/ui/h3";
import { P } from "@repo/ui/p";
import { RadioButton } from "@repo/ui/radiobutton";
import { CreditCard } from "lucide-react";
import BankAccountWrapper from "./BankAccountWrapper/BankAccountWrapper";
import BankAccountContainer from "./BankAccountWrapper/BankAccountContainer/BankAccountContainer";
import Circle from "./BankAccountWrapper/BankAccountContainer/Circle/Circle";
import BankAccountInfo from "./BankAccountWrapper/BankAccountContainer/BankAccountInfo/BankAccountInfo";
import { useState } from "react";
// 계좌 타입을 정의합니다
interface BankAccount {
  fintech_use_num: string;
  account_alias: string;
  bank_name: string;
  account_num_masked: string;
}

// 컴포넌트 props 인터페이스명과 속성을 명확히 구분합니다
interface BankAccountSelectorProps {
  accounts: BankAccount[];
  onAccountSelect: (id: string) => void;
}

const BankAccountSelector = ({
  accounts,
  onAccountSelect,
}: BankAccountSelectorProps) => {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const handleAccountSelect = (accountId: string) => {
    setSelectedAccount(accountId);
    onAccountSelect(accountId);
  };

  return (
    <BankAccountWrapper>
      {accounts.map((account: BankAccount) => (
        <BankAccountContainer key={account.fintech_use_num}>
          <section
            style={{ display: "flex", gap: "10px", alignItems: "center" }}
          >
            <Circle color="#687AD7">
              <CreditCard width={15} height={15} color="#ffffff" />
            </Circle>
            <BankAccountInfo>
              <H3>{account.bank_name}</H3>
              <P>{account.account_num_masked}</P>
            </BankAccountInfo>
          </section>
          <RadioButton
            checked={selectedAccount === account.fintech_use_num}
            onChange={() => handleAccountSelect(account.fintech_use_num)}
          />
        </BankAccountContainer>
      ))}
    </BankAccountWrapper>
  );
};
export default BankAccountSelector;
