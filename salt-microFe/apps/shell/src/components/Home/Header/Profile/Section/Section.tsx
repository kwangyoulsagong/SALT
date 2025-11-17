import { Name, Wrapper } from "./Section.css";
import { Heading } from "@repo/ui/heading";
import { P } from "@repo/ui/p";
interface ProfileSectionProps {
  nickname: string | undefined;
  email: string | undefined;
}
const Section = ({ nickname, email }: ProfileSectionProps) => {
  return (
    <article className={Wrapper}>
      <Heading level={3}>{nickname}</Heading>
      <P variant="email">{email}</P>
    </article>
  );
};
export default Section;
