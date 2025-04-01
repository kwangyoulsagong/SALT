import { Icons } from "./Styles/Icon.css.ts";

type goalsType = "trip" | "car" | "shopping" | "home" | "gift" | "married";
interface IconProps {
  url?: string;
  variant?: goalsType;
  onClick?: () => void;
}

export const Icon = ({ url, variant, onClick }: IconProps) => {
  const goalsVariant = {
    trip: "/assets/goals/images/trip.svg",
    car: "/assets/goals/images/car.svg",
    shopping: "/assets/goals/images/shopping.svg",
    home: "/assets/goals/images/home.svg",
    gift: "/assets/goals/images/gift.svg",
    married: "/assets/goals/images/married.svg",
  };
  const imgsrc = variant ? goalsVariant[variant] : url;
  return (
    <img
      onClick={onClick}
      className={Icons}
      src={imgsrc}
      alt="도메인 이미지"
      width={35}
      height={35}
    />
  );
};
