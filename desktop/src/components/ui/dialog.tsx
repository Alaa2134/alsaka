import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export function DialogContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
      <RadixDialog.Content
        dir="rtl"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-card p-6 shadow-elevated focus:outline-none",
          className,
        )}
      >
        {children}
        <RadixDialog.Close className="absolute left-4 top-4 rounded p-1 text-muted-foreground hover:bg-secondary">
          <X className="h-4 w-4" />
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-1.5">{children}</div>;
}
export function DialogTitle({ children }: { children: ReactNode }) {
  return <RadixDialog.Title className="text-lg font-semibold">{children}</RadixDialog.Title>;
}
export function DialogDescription({ children }: { children: ReactNode }) {
  return (
    <RadixDialog.Description className="text-sm text-muted-foreground">
      {children}
    </RadixDialog.Description>
  );
}
export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="flex flex-row-reverse gap-2">{children}</div>;
}
