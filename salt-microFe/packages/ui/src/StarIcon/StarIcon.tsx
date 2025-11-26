import { SVGProps } from "react";

export interface StarIconProps extends SVGProps<SVGSVGElement> {
  filled?: boolean;
  size?: number;
}

export const StarIcon = ({
  filled = false,
  size = 16,
  ...props
}: StarIconProps) => {
  const fill = filled ? "#E1746D" : "#BEBEBE";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        d="M3.88325 14.6667L4.96659 9.98333L1.33325 6.83333L6.13325 6.41667L7.99992 2L9.86658 6.41667L14.6666 6.83333L11.0333 9.98333L12.1166 14.6667L7.99992 12.1833L3.88325 14.6667Z"
        fill={fill}
      />
    </svg>
  );
};
