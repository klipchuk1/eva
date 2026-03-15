import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "relative inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e1a] disabled:pointer-events-none disabled:opacity-40 cursor-pointer",
          {
            primary:
              "bg-gradient-to-b from-amber-400 to-amber-500 text-gray-950 rounded-xl hover:from-amber-300 hover:to-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.25)] hover:shadow-[0_0_24px_rgba(245,158,11,0.35)] focus-visible:ring-amber-500 active:scale-[0.98]",
            secondary:
              "glass rounded-xl text-slate-300 hover:text-white focus-visible:ring-white/20 active:scale-[0.98]",
            ghost:
              "text-slate-400 hover:text-white hover:bg-white/5 rounded-lg focus-visible:ring-white/20",
            danger:
              "bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 focus-visible:ring-red-500",
          }[variant],
          {
            sm: "h-8 px-3 text-xs gap-1.5",
            md: "h-10 px-4 text-sm gap-2",
            lg: "h-12 px-6 text-sm gap-2",
          }[size],
          className
        )}
        {...props}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-20"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-80"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
