import { Icons } from "./Styles/Icon.css";

export const Icon = ({ url = "" }: { url?: string }) => {
  return <img className={Icons} src={url} alt="도메인 이미지" />;
};
