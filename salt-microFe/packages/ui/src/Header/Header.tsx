import { ReactNode } from "react";
import { HeaderButton, NavWrapper, Wrapper } from "./Header.css.ts";
import { H3 } from "../Typo/H3/H3.tsx";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/router";
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
      <H3>{children}</H3>
    </header>
  ) : (
    <header className={Wrapper}>{children}</header>
  );
};
