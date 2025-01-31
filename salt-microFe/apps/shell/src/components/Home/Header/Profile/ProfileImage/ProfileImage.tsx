import Image from "next/image";
import { ProfileContainer } from "./ProfileImage.css";
import { useAppSelector } from "@/hooks/redux/hooks";

const ProfileImage = ({ Profile }: { Profile: string | undefined }) => {
  return (
    <>
      {Profile ? (
        <Image
          className={ProfileContainer}
          src={Profile}
          width={100}
          height={100}
          alt="프로필 이미지"
        />
      ) : (
        <p>프로필 이미지를 불러오는 중입니다...</p>
      )}
    </>
  );
};
export default ProfileImage;
