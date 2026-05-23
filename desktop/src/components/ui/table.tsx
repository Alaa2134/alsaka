import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function DataTable({
  className,
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className={cn("w-full text-sm", className)} {...props} />
    </div>
  );
}
export const THead = (props: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className="bg-secondary/60 text-foreground" {...props} />
);
export const TR = ({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("border-b border-border last:border-0", className)} {...props} />
);
export const TH = ({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn("px-3 py-2.5 text-right font-medium whitespace-nowrap", className)}
    {...props}
  />
);
export const TD = ({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("px-3 py-2 text-right", className)} {...props} />
);
