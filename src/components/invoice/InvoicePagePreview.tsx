import { InvoicePageLayoutSettings } from "@/hooks/useInvoicePageLayout";
import { FileText, ScanBarcode, Table2, Calculator, MessageSquare, PenTool, FileSignature } from "lucide-react";

interface InvoicePagePreviewProps {
  settings: InvoicePageLayoutSettings;
}

const sectionIcons: Record<string, React.ReactNode> = {
  header: <FileText className="h-4 w-4" />,
  barcode: <ScanBarcode className="h-4 w-4" />,
  table: <Table2 className="h-4 w-4" />,
  footer: <Calculator className="h-4 w-4" />,
};

const sectionColors: Record<string, string> = {
  header: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  barcode: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
  table: "from-green-500/20 to-green-600/10 border-green-500/30",
  footer: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
};

export const InvoicePagePreview = ({ settings }: InvoicePagePreviewProps) => {
  const sortedSections = [...settings.sections].sort((a, b) => a.order - b.order);
  const visibleSections = sortedSections.filter(s => s.visible);

  const getHeaderStyle = () => {
    switch (settings.headerStyle) {
      case "minimal": return "h-16";
      case "expanded": return "h-28";
      default: return "h-20";
    }
  };

  const getTableStyle = () => {
    switch (settings.tableStyle) {
      case "compact": return "gap-0.5";
      case "spacious": return "gap-2";
      default: return "gap-1";
    }
  };

  const renderSectionPreview = (sectionId: string) => {
    const baseClasses = `rounded-lg border bg-gradient-to-br transition-all duration-300 ${sectionColors[sectionId] || "from-muted/50 to-muted/30 border-border"}`;
    const compactPadding = settings.compactMode ? "p-2" : "p-3";

    switch (sectionId) {
      case "header":
        return (
          <div className={`${baseClasses} ${compactPadding} ${getHeaderStyle()}`}>
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <div className="h-3 w-32 bg-foreground/20 rounded" />
                  <div className="h-2 w-24 bg-foreground/10 rounded" />
                </div>
              </div>
              <div className="text-left space-y-1">
                <div className="h-2.5 w-20 bg-foreground/15 rounded" />
                <div className="h-2 w-16 bg-foreground/10 rounded" />
                {settings.headerStyle === "expanded" && (
                  <>
                    <div className="h-2 w-24 bg-foreground/10 rounded mt-2" />
                    <div className="h-2 w-20 bg-foreground/10 rounded" />
                  </>
                )}
              </div>
            </div>
          </div>
        );

      case "barcode":
        return (
          <div className={`${baseClasses} ${compactPadding}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center">
                <ScanBarcode className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="h-8 bg-muted rounded flex items-center px-3">
                  <div className="h-2 w-40 bg-foreground/10 rounded" />
                </div>
              </div>
              {settings.showBarcodeScanner && (
                <div className="w-8 h-8 rounded bg-purple-500/30 animate-pulse" />
              )}
            </div>
          </div>
        );

      case "table":
        return (
          <div className={`${baseClasses} ${compactPadding} min-h-[120px]`}>
            {/* Table Header */}
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-green-500/20">
              <div className="w-6 h-4 bg-green-500/30 rounded" />
              <div className="flex-1 h-4 bg-green-500/20 rounded" />
              <div className="w-12 h-4 bg-green-500/20 rounded" />
              <div className="w-12 h-4 bg-green-500/20 rounded" />
              <div className="w-16 h-4 bg-green-500/20 rounded" />
            </div>
            
            {/* Table Rows */}
            <div className={`flex flex-col ${getTableStyle()}`}>
              {[1, 2, 3].map((row) => (
                <div key={row} className="flex items-center gap-2">
                  <div className="w-6 h-3 bg-foreground/10 rounded" />
                  <div className="flex-1 h-3 bg-foreground/10 rounded" />
                  <div className="w-12 h-3 bg-foreground/10 rounded" />
                  <div className="w-12 h-3 bg-foreground/10 rounded" />
                  <div className="w-16 h-3 bg-foreground/10 rounded" />
                </div>
              ))}
              {/* Empty row for new item */}
              <div className="flex items-center gap-2 opacity-50 border border-dashed border-green-500/30 rounded p-1">
                <div className="w-6 h-3 bg-green-500/10 rounded" />
                <div className="flex-1 h-3 bg-green-500/10 rounded" />
                <div className="w-12 h-3 bg-green-500/10 rounded" />
                <div className="w-12 h-3 bg-green-500/10 rounded" />
                <div className="w-16 h-3 bg-green-500/10 rounded" />
              </div>
            </div>
          </div>
        );

      case "footer":
        const footerLayout = settings.footerPosition === "side" 
          ? "flex-row items-start gap-4" 
          : "flex-col gap-3";
        
        return (
          <div className={`${baseClasses} ${compactPadding}`}>
            <div className={`flex ${footerLayout}`}>
              {/* Totals Section */}
              <div className={`space-y-2 ${settings.footerPosition === "side" ? "flex-1" : "w-full"}`}>
                <div className="flex justify-between items-center">
                  <div className="h-2.5 w-16 bg-foreground/10 rounded" />
                  <div className="h-3 w-20 bg-orange-500/30 rounded" />
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-2.5 w-12 bg-foreground/10 rounded" />
                  <div className="h-3 w-16 bg-red-500/20 rounded" />
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-2.5 w-14 bg-foreground/10 rounded" />
                  <div className="h-3 w-16 bg-green-500/20 rounded" />
                </div>
                <div className="border-t border-orange-500/30 pt-2 flex justify-between items-center">
                  <div className="h-3 w-16 bg-foreground/20 rounded" />
                  <div className="h-4 w-24 bg-orange-500/40 rounded font-bold" />
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className={`flex gap-2 ${settings.footerPosition === "side" ? "flex-col" : "flex-row justify-end"}`}>
                <div className="h-8 w-20 bg-primary/30 rounded" />
                <div className="h-8 w-20 bg-green-500/30 rounded" />
                <div className="h-8 w-20 bg-blue-500/30 rounded" />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-background border-2 border-dashed border-primary/30 rounded-xl overflow-hidden">
      {/* Preview Header */}
      <div className="bg-muted/50 border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className="text-xs text-muted-foreground">معاينة مباشرة - صفحة الفاتورة</span>
        <div className="flex items-center gap-1">
          {settings.showWhatsAppStatus && (
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          )}
          {settings.showAutosaveIndicator && (
            <div className="text-[10px] text-muted-foreground">آخر حفظ: الآن</div>
          )}
        </div>
      </div>

      {/* Preview Content */}
      <div className={`p-4 space-y-3 ${settings.compactMode ? "space-y-2" : "space-y-3"}`}>
        {visibleSections.map((section) => (
          <div 
            key={section.id}
            className="relative group"
          >
            {/* Section Label */}
            <div className="absolute -top-2 right-2 z-10">
              <span className="text-[10px] bg-background border px-1.5 py-0.5 rounded-full text-muted-foreground flex items-center gap-1">
                {sectionIcons[section.id]}
                {section.nameAr}
              </span>
            </div>
            
            {renderSectionPreview(section.id)}
          </div>
        ))}

        {/* Hidden sections indicator */}
        {sortedSections.filter(s => !s.visible).length > 0 && (
          <div className="text-center py-2">
            <span className="text-xs text-muted-foreground">
              {sortedSections.filter(s => !s.visible).length} قسم مخفي
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
