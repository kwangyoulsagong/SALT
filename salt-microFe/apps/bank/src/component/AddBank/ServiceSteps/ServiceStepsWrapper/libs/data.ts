import { Lock, CheckCircle, CreditCard } from "lucide-react";

export interface ServiceStepConfig {
  step: number;
  icon?: React.ElementType;
  header: string;
  text: string;
  button?: string;
}

export const ServiceStep: ServiceStepConfig[] = [
  {
    step: 1,
    header: "사용자 인증",
    text: "오픈뱅킹 서비스 이용을 위해 사용자 인증이 필요합니다.",
    button: "인증하기",
  },
  {
    step: 2,
    icon: CreditCard,
    header: "계좌 선택",
    text: "등록할 계좌를 선택해 주세요.",
    button: "계좌 등록하기",
  },
  {
    step: 3,
    icon: CheckCircle,
    header: "등록 완료",
    text: "계좌가 성공적으로 등록되었습니다.",
  },
];
