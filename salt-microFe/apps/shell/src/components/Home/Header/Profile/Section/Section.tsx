import { Name, Wrapper } from "./Section.css";
import { H3 } from "@repo/ui/h3";
interface ProfileSectionProps {
  nickname: string | undefined;
  email: string | undefined;
}
const Section = ({ nickname, email }: ProfileSectionProps) => {
  return (
    <article className={Wrapper}>
      <H3>{nickname}</H3>
      <p>{email}</p>
    </article>
  );
};
export default Section;
