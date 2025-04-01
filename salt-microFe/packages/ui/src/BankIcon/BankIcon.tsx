import { Icons } from "./Styles/BankIcon.css.ts";

type bankType = "empty";
interface IconProps {
  variant?: bankType;
}

export const BankIcon = ({ variant = "empty" }: IconProps) => {
  const BankVariant = {
    empty: "/assets/Bank/images/accountempty.svg",
  };

  return (
    <img
      className={Icons}
      src={BankVariant[variant]}
      alt="도메인 이미지"
      width={35}
      height={35}
    />
  );
};
