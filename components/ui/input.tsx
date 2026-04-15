import * as React from "react";
import { cn } from "../../lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="flex flex-col gap-2 text-sm">
        {label ? <span className="text-muted">{label}</span> : null}
        <input
          ref={ref}
          className={cn(
            "input-surface rounded-2xl px-4 py-3 text-sm text-fog placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-ember/40",
            className
          )}
          {...props}
        />
      </label>
    );
  }
);

Input.displayName = "Input";
