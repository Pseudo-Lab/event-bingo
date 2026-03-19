import type { HTMLAttributes, TableHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export const Table = ({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) => {
  return <table className={cn("w-full caption-bottom text-sm", className)} {...props} />;
};

export const TableHeader = ({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) => {
  return <thead className={cn("[&_tr]:border-b", className)} {...props} />;
};

export const TableBody = ({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) => {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
};

export const TableRow = ({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) => {
  return (
    <tr
      className={cn("border-b border-slate-100 transition-colors hover:bg-slate-50/60", className)}
      {...props}
    />
  );
};

export const TableHead = ({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) => {
  return (
    <th
      className={cn(
        "h-12 px-4 text-left align-middle text-xs font-semibold text-slate-400",
        className
      )}
      {...props}
    />
  );
};

export const TableCell = ({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) => {
  return <td className={cn("px-4 py-5 align-middle text-slate-700", className)} {...props} />;
};
