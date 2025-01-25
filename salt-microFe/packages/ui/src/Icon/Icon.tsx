import { Icons } from "./Styles/Icon.css.ts";
import tripIcon from "../../../assets/GoalsVariants/trip.svg";
type goalsType = "trip" | undefined;
interface IconProps {
  url?: string;
  variant?: goalsType;
}
export const Icon = ({ url, variant }: IconProps) => {
  const goalsVariant = {
    trip: tripIcon,
  };
  return (
    <img
      className={Icons}
      src={url || (variant && goalsVariant[variant])}
      alt="도메인 이미지"
    />
  );
};
