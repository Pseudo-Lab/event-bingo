import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement>;

export const Card = ({ className, ...props }: CardProps) => {
  return (
    <div
      className={cn("rounded-3xl border border-slate-200 bg-white shadow-soft", className)}
      {...props}
    />
  );
};

export const CardHeader = ({ className, ...props }: CardProps) => {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />;
};

export const CardTitle = ({ className, ...props }: CardProps) => {
  return <div className={cn("text-xl font-bold tracking-tight text-brand-800", className)} {...props} />;
};

export const CardDescription = ({ className, ...props }: CardProps) => {
  return <div className={cn("text-sm text-slate-500", className)} {...props} />;
};

export const CardContent = ({ className, ...props }: CardProps) => {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
};
