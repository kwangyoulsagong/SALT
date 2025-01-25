import { Icons } from "./Styles/Icon.css.ts";
type serviceType = "mission" | "analysis";
interface IconProps {
  variant?: serviceType;
}

export const ServiceIcon = ({ variant = "mission" }: IconProps) => {
  const serviceVariant = {
    mission: "/assets/Icons/mission.svg",
    analysis: "/assets/Icons/analysis.svg",
  };

  return (
    <img
      className={Icons}
      src={serviceVariant[variant]}
      alt="도메인 이미지"
      width={35}
      height={35}
    />
  );
};
