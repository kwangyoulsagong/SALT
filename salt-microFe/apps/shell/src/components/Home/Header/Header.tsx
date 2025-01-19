import { useAppSelector } from "@/hooks/redux/hooks";
import { Container } from "./Header.css";
import ProfileImage from "./Profile/ProfileImage/ProfileImage";

const Header = () => {
  const profile = useAppSelector((state) => state.auth);
  return (
    <header className={Container}>
      <ProfileImage />
      <span>{profile.isAuthenticated ? profile.user?.nickname : ""}</span>
    </header>
  );
};
export default Header;
