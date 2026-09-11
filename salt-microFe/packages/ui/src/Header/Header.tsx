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
}
export const Header = ({ route = false, children }: HeaderProps) => {
  const router = useRouter();
  return route ? (
    <header className={NavWrapper}>
      <button className={HeaderButton} onClick={() => router.back()}>
        <ChevronLeft />
      </button>
      <Heading level={3}>{children}</Heading>
    </header>
  ) : (
    <header className={Wrapper}>{children}</header>
  );
};
