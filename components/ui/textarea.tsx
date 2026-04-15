import * as React from "react";
import { cn } from "../../lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="flex flex-col gap-2 text-sm">
        {label ? <span className="text-muted">{label}</span> : null}
        <textarea
          ref={ref}
          className={cn(
            "input-surface min-h-[120px] rounded-2xl px-4 py-3 text-sm text-fog placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-ember/40",
            className
          )}
          {...props}
        />
      </label>
    );
  }
);

Textarea.displayName = "Textarea";
