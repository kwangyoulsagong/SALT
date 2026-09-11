import { Wrapper } from "./Section.css";
import { Heading } from "@repo/ui/heading";
import { Text } from "@repo/ui/text";
interface ProfileSectionProps {
  nickname: string | undefined;
  email: string | undefined;
}
const Section = ({ nickname, email }: ProfileSectionProps) => {
  return (
    <article className={Wrapper}>
      <Heading level={3}>{nickname}</Heading>
      <Text variant="bodyLarge" color="muted">
        {email}
      </Text>
    </article>
  );
};
export default Section;
