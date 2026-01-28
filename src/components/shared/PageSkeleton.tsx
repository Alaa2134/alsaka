import { TomAndJerryLoader } from "./TomAndJerryLoader";

interface PageSkeletonProps {
  variant?: "dashboard" | "table" | "form" | "cards" | "login";
  animated?: boolean;
}

export const PageSkeleton = ({ variant = "dashboard", animated = true }: PageSkeletonProps) => {
  // دائماً نظهر توم وجيري أثناء التحميل
  const getLoadingText = () => {
    switch (variant) {
      case "login":
        return "جاري تحميل صفحة الدخول...";
      case "dashboard":
        return "جاري تحميل لوحة التحكم...";
      case "table":
        return "جاري تحميل البيانات...";
      case "form":
        return "جاري تحميل الصفحة...";
      case "cards":
        return "جاري تحميل المنتجات...";
      default:
        return "جاري التحميل...";
    }
  };

  const getSize = () => {
    switch (variant) {
      case "login":
        return "md";
      case "dashboard":
        return "lg";
      default:
        return "lg";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <TomAndJerryLoader text={getLoadingText()} size={getSize()} />
    </div>
  );
};

export default PageSkeleton;
