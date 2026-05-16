import { Link, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export function ConfirmationPage() {
  const { slug, orderNumber } = useParams<{ slug: string; orderNumber: string }>();
  return (
    <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="mx-auto h-20 w-20 rounded-full bg-success/10 text-success flex items-center justify-center mb-6">
        <CheckCircle2 className="h-12 w-12" />
      </div>
      <h1 className="text-3xl font-bold mb-2">تم استلام طلبك</h1>
      <p className="text-muted-foreground">
        رقم الطلب: <span className="font-bold tabular-nums">#{orderNumber}</span>
      </p>
      <p className="text-muted-foreground mt-4">
        سيتواصل معك فريقنا قريبًا لتأكيد التفاصيل وتسليم الطلب.
      </p>
      <div className="flex flex-wrap gap-3 justify-center mt-8">
        <Link to={`/${slug}/track`} className="btn-outline">تتبع الطلب</Link>
        <Link to={`/${slug}`} className="btn-primary">العودة للرئيسية</Link>
      </div>
    </div>
  );
}
