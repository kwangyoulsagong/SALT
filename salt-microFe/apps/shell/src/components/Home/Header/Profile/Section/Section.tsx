import { Name, Wrapper } from "./Section.css";
import { H3 } from "@repo/ui/h3";
import { P } from "@repo/ui/p";
interface ProfileSectionProps {
  nickname: string | undefined;
  email: string | undefined;
}
const Section = ({ nickname, email }: ProfileSectionProps) => {
  return (
    <article className={Wrapper}>
      <H3>{nickname}</H3>
      <P variant="email">{email}</P>
    </article>
  );
};
export default Section;
