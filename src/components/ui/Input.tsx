import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={twMerge(
        clsx(
          "w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder-white/40 outline-none focus:border-purple-400 transition-colors"
        ),
        className
      )}
      {...props}
    />
  );
}
