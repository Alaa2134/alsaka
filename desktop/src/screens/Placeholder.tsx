import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Stand-in for screens whose detailed UI isn't built yet. The route, the role
 * guard, and the navigation are all real — only the inner UI is a stub so the
 * shell remains complete.
 */
export function Placeholder({ title, description }: { title: string; description?: string }) {
  return (
    <Card>
      <CardContent className="p-10 text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-primary">
          <Construction className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {description ||
            "هذه الشاشة جزء من الهيكل المنشأ. الـ routing و الصلاحيات تعمل ويمكن التوسع داخل واجهتها."}
        </p>
      </CardContent>
    </Card>
  );
}
