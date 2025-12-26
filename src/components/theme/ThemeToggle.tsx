import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-9 w-9"
        >
          {theme === "dark" ? (
            <Sun size={18} className="text-yellow-500" />
          ) : (
            <Moon size={18} className="text-slate-700" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
      </TooltipContent>
    </Tooltip>
  );
};