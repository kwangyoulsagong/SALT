"use client";

// 클라이언트 잎: 프로필을 store 에서 읽는다.
import { useAuthState } from "../model/selectors";
import { Container } from "./ProfileHeader.css";
import { ProfileImage } from "./ProfileImage";
import { ProfileSection } from "./ProfileSection";

/** 표시 전용 (`fsd-entities.md`). 여기서 mutation 을 부르지 않는다. */
export const ProfileHeader = () => {
  const profile = useAuthState();
  return (
    <header className={Container}>
      <ProfileImage profile={profile.user?.profile} />
      <ProfileSection
        nickname={profile.user?.nickname}
        email={profile.user?.email}
      />
    </header>
  );
};

export default ProfileHeader;
