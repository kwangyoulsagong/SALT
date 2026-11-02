import { Email, Name, Wrapper } from "./ProfileSection.css";

interface ProfileSectionProps {
  nickname: string | undefined;
  email: string | undefined;
}

/**
 * 표시 전용 (`fsd-entities.md`).
 *
 * `Heading`·`Text` 대신 이 슬라이스의 스타일을 쓴다 — 헤더 한 줄에 들어가는 이름은 문서의
 * 제목이 아니라 **식별자**다. `h3` 로 두면 페이지 제목 위계를 가로챈다.
 */
export const ProfileSection = ({ nickname, email }: ProfileSectionProps) => {
  // `span` 인 이유(2026-09-24): 헤더 프로필이 드롭다운 메뉴의 **버튼 안**에 들어간다.
  // `article` 은 버튼 안에 둘 수 없다(버튼 내용은 phrasing content 만 허용).
  return (
    <span className={Wrapper}>
      <span className={Name}>{nickname}</span>
      <span className={Email}>{email}</span>
    </span>
  );
};

export default ProfileSection;
