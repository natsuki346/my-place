import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={twMerge(
        clsx(
          "rounded-full px-5 py-2.5 font-semibold transition-colors",
          {
            "bg-purple-600 text-white hover:bg-purple-500": variant === "primary",
            "bg-indigo-600 text-white hover:bg-indigo-500": variant === "secondary",
            "bg-transparent text-white hover:bg-white/10": variant === "ghost",
          }
        ),
        className
      )}
      {...props}
    />
  );
}
