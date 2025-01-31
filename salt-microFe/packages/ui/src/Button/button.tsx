"use client";

import { ReactNode } from "react";
import { buttonVariants } from "./styles/button.css.ts";
import { useRouter } from "next/router";

interface ButtonProps {
  children: ReactNode;
  variant?: keyof typeof buttonVariants;
  eventType?: string;
  eventValue?: string;
}

export const Button = ({
  children,
  variant = "primary",
  eventType,
  eventValue = "",
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
      className={`${buttonVariants[variant]}`}
      onClick={handleClick}
      type="button"
    >
      {children}
    </button>
  );
};
