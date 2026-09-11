import Image from "next/image";

import { AUTH_MESSAGES } from "../model/messages";
import { ProfileContainer } from "./ProfileImage.css";

export const ProfileImage = ({ profile }: { profile: string | undefined }) => {
  return (
    <>
      {profile ? (
        <Image
          className={ProfileContainer}
          src={profile}
          width={100}
          height={100}
          alt={AUTH_MESSAGES.profileImageAlt}
        />
      ) : (
        <p>{AUTH_MESSAGES.profileImageLoading}</p>
      )}
    </>
  );
};

export default ProfileImage;
