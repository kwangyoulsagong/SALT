"use client";

import { ReactNode } from "react";
import { buttonVariants } from "./styles/button.css";

interface ButtonProps {
  children: ReactNode;
  className?: string;
  appName: string;
  variant?: keyof typeof buttonVariants;
}

export const Button = ({
  children,
  className = "",
  appName,
  variant = "primary",
}: ButtonProps) => {
  return (
    <button
      className={`${buttonVariants[variant]} ${className}`}
      onClick={() => alert(`Hello from your ${appName} app!`)}
    >
      {children}
    </button>
  );
};
