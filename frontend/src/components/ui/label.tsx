import type { LabelHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export const Label = ({ className, ...props }: LabelProps) => {
  return (
    <label
      className={cn("text-sm font-semibold text-brand-800", className)}
      {...props}
    />
  );
};
