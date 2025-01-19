import { Name, Wrapper } from "./Section.css";

interface ProfileSectionProps {
  nickname: string | undefined;
  email: string | undefined;
}
const Section = ({ nickname, email }: ProfileSectionProps) => {
  return (
    <article className={Wrapper}>
      <span className={Name}>{nickname}</span>
      <p>{email}</p>
    </article>
  );
};
export default Section;
