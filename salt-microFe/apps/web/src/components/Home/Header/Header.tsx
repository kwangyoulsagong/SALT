import { useAppSelector } from "@/hooks/redux/hooks";
import { Container } from "./Header.css";
import ProfileImage from "./Profile/ProfileImage/ProfileImage";
import Section from "./Profile/Section/Section";

const Header = () => {
  const profile = useAppSelector((state) => state.auth);
  return (
    <header className={Container}>
      <ProfileImage Profile={profile.user?.profile} />
      <Section nickname={profile.user?.nickname} email={profile.user?.email} />
    </header>
  );
};
export default Header;
