"use client";

import { ReactNode } from "react";
import { buttonVariants } from "./styles/button.css";
import { useRouter } from "next/router.js";

interface ButtonProps {
  children: ReactNode;
  className?: string;
  variant?: keyof typeof buttonVariants;
  eventType?: string;
  eventValue?: string;
}

export const Button = ({
  children,
  className = "",
  variant = "primary",
  eventType,
  eventValue,
}: ButtonProps) => {
  const router = useRouter();

  const events = {
    route: () => router.push(eventValue || "/"),
    alert: () => alert(eventValue),
    console: () => console.log(eventValue),
  };

  const handleClick = () => {
    if (eventType && eventType in events) {
      events[eventType as keyof typeof events]();
    }
  };

  return (
    <button
      className={`${buttonVariants[variant]} ${className}`.trim()}
      onClick={handleClick}
      type="button"
    >
      {children}
    </button>
  );
};
