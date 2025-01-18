import { useAppSelector } from "@/hooks/redux/hooks";
import { Container } from "./Header.css";

const Header = () => {
  const profile = useAppSelector((state) => state.auth);
  console.log(profile);
  return (
    <header className={Container}>
      <span>{profile.isAuthenticated ? profile.user?.nickname : ""}</span>
    </header>
  );
};
export default Header;
