"use client";

import { ReactNode } from "react";
import { buttonVariants } from "./styles/button.css";
import { useRouter } from "next/router.js";

interface ButtonProps {
  children: ReactNode;
  className?: string;
  variant?: keyof typeof buttonVariants;
  routes: string;
}

export const Button = ({
  children,
  className = "",
  variant = "primary",
  routes = "",
}: ButtonProps) => {
  const router = useRouter();
  return (
    <button
      className={`${buttonVariants[variant]} ${className}`}
      onClick={() => router.push(routes)}
    >
      {children}
    </button>
  );
};
