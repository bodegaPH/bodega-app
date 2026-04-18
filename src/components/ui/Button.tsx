import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-mono uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-none";

  const variants = {
    primary:
      "bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/20 shadow-[0_0_15px_rgba(99,102,241,0.2)] disabled:shadow-none disabled:border-transparent",
    ghost:
      "bg-transparent hover:bg-white/5 border border-white/10 text-zinc-400 hover:text-white",
    danger:
      "bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 shadow-[inset_0_0_8px_rgba(244,63,94,0.1)]",
  };

  const sizes = {
    sm: "px-3 py-2 text-[9px]",
    md: "px-5 py-2.5 text-[10px]",
    lg: "px-8 py-3 text-[11px]",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        children
      )}
    </button>
  );
}
