import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./delight.module.css";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "quiet";
  children: ReactNode;
}

const VARIANT = {
  primary:
    "w-full border-2 border-transparent bg-action text-on-action enabled:hover:bg-action-hover",
  secondary: "w-full border-2 border-ink bg-transparent text-ink enabled:hover:bg-canvas",
  quiet: "border-2 border-transparent bg-transparent text-action-quiet enabled:hover:underline",
} as const;

export function Button({ variant = "primary", className, type = "button", children, ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`${styles.button} ${variant === "primary" ? styles.primary : ""} inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-center text-base font-semibold disabled:cursor-not-allowed disabled:border-transparent disabled:bg-disabled disabled:text-ink ${VARIANT[variant]} ${className ?? ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}
