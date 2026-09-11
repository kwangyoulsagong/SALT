import { Heading } from "@repo/ui/heading";
import { Text } from "@repo/ui/text";

import { Wrapper } from "./ProfileSection.css";

interface ProfileSectionProps {
  nickname: string | undefined;
  email: string | undefined;
}

export const ProfileSection = ({ nickname, email }: ProfileSectionProps) => {
  return (
    <article className={Wrapper}>
      <Heading level={3}>{nickname}</Heading>
      <Text variant="bodyLarge" color="muted">
        {email}
      </Text>
    </article>
  );
};

export default ProfileSection;
