import { ReactNode } from "react";
import { HeaderButton, NavWrapper, Wrapper } from "./Header.css";
import { Heading } from "../Typo/Heading/Heading";
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
      <Heading level={3}>{children}</Heading>
    </header>
  ) : (
    <header className={Wrapper}>{children}</header>
  );
};
