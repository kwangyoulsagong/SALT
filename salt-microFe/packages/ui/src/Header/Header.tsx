"use client";

// 클라이언트 잎: route 모드에서 router.back() 을 호출한다.
import { ReactNode } from "react";
import { HeaderButton, NavWrapper, Wrapper } from "./Header.css";
import { Heading } from "../Typo/Heading/Heading";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
interface HeaderProps {
  route?: boolean;
  children: ReactNode;
  /** 아이콘만 있는 뒤로 버튼의 이름 (axe `button-name`) */
  backLabel?: string;
}
export const Header = ({ route = false, children, backLabel = "뒤로 가기" }: HeaderProps) => {
  const router = useRouter();
  return route ? (
    <header className={NavWrapper}>
      <button type="button" className={HeaderButton} onClick={() => router.back()} aria-label={backLabel}>
        <ChevronLeft aria-hidden="true" />
      </button>
      <Heading level={3}>{children}</Heading>
    </header>
  ) : (
    <header className={Wrapper}>{children}</header>
  );
};
