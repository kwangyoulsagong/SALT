import Image from "next/image";

import { AUTH_MESSAGES } from "../model/messages";
import { fallback, ProfileContainer } from "./ProfileImage.css";

/**
 * 프로필 이미지. 없으면 **이니셜 원**을 그린다.
 *
 * 전에는 이미지가 없을 때 "프로필 이미지를 불러오는 중입니다…" 를 그렸다(2026-09-23 정정).
 * 서버는 `profileImageUrl: null` 을 주고 그게 정상 상태인데, 화면은 **영원히 로딩 중**이라고
 * 말하고 있었다 — 없는 것과 기다리는 것은 다르다. 문구가 아니라 자리를 채운다.
 */
export const ProfileImage = ({
  profile,
  name,
}: {
  profile: string | undefined;
  name: string | undefined;
}) => {
  if (profile) {
    return (
      <Image
        className={ProfileContainer}
        src={profile}
        width={48}
        height={48}
        alt={AUTH_MESSAGES.profileImageAlt}
      />
    );
  }

  return (
    <span className={`${ProfileContainer} ${fallback}`} aria-hidden>
      {initialOf(name)}
    </span>
  );
};

/** 첫 글자. 이름이 없으면 빈 원으로 둔다 — 물음표나 기본 얼굴을 만들지 않는다. */
const initialOf = (name: string | undefined): string =>
  name?.trim().slice(0, 1).toUpperCase() ?? "";

export default ProfileImage;
