import * as TabsPrim from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrim.Root;
export const TabsList = ({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrim.List>) => (
  <TabsPrim.List
    className={cn(
      "inline-flex h-10 items-center justify-center gap-1 rounded-md bg-secondary p-1",
      className,
    )}
    {...props}
  />
);
export const TabsTrigger = ({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrim.Trigger>) => (
  <TabsPrim.Trigger
    className={cn(
      "inline-flex items-center justify-center rounded px-3 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-soft text-muted-foreground",
      className,
    )}
    {...props}
  />
);
export const TabsContent = ({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrim.Content>) => (
  <TabsPrim.Content className={cn("mt-4 focus-visible:outline-none", className)} {...props} />
);
