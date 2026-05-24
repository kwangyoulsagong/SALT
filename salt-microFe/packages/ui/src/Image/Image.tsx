import { ImgHTMLAttributes, useState } from "react";
import { imgBaseStyle, hoverScaleStyle } from "./styles/image.css.ts";

export interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  border?: string;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  objectPosition?: string;
  backgroundColor?: string;

  fallback?: string;
  hoverScale?: boolean;
}

export const Image = ({
  width,
  height,
  radius,
  border,
  objectFit = "cover",
  objectPosition = "center",
  backgroundColor,
  fallback,
  draggable = false,
  hoverScale = false,
  style,
  alt = "",
  className,
  onError,
  ...props
}: ImageProps) => {
  const [errored, setErrored] = useState(false);

  return (
    <img
      alt={alt}
      draggable={draggable}
      onError={(e) => {
        if (fallback && !errored) {
          setErrored(true);
          (e.target as HTMLImageElement).src = fallback;
        }
        onError?.(e);
      }}
      className={`
        ${imgBaseStyle}
        ${hoverScale ? hoverScaleStyle : ""}
        ${className || ""}
      `}
      style={{
        width,
        height,
        borderRadius: radius,
        border,
        objectFit,
        objectPosition,
        backgroundColor,
        ...style,
      }}
      {...props}
    />
  );
};
