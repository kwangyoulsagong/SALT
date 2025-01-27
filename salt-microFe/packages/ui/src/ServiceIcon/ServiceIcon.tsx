import { Icons } from "./Styles/Icon.css.ts";
type serviceType = "mission" | "analysis" | "ranking" | "tip" | "social";
interface IconProps {
  variant?: serviceType;
}

export const ServiceIcon = ({ variant = "mission" }: IconProps) => {
  const serviceVariant = {
    mission: "/assets/Icons/mission.svg",
    analysis: "/assets/Icons/analysis.svg",
    ranking: "/assets/Icons/ranking.svg",
    tip: "/assets/Icons/tip.svg",
    social: "/assets/Icons/social.svg",
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
