import { useState, useRef, useCallback, useEffect } from "react";
import { Move, Lock, Unlock, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TemplateSettings, ElementPosition, defaultElementPositions } from "@/hooks/useInvoiceTemplates";

interface DraggableInvoiceCanvasProps {
  settings: TemplateSettings;
  onPositionChange: (positions: Record<string, ElementPosition>) => void;
}

const elementLabels: Record<string, string> = {
  header: "ترويسة الشركة",
  invoiceInfo: "معلومات الفاتورة",
  itemsTable: "جدول الأصناف",
  totals: "الإجماليات",
  notes: "الملاحظات",
  signatures: "التوقيعات",
  footer: "التذييل",
};

const elementColors: Record<string, string> = {
  header: "#3b82f6",
  invoiceInfo: "#10b981",
  itemsTable: "#8b5cf6",
  totals: "#f59e0b",
  notes: "#06b6d4",
  signatures: "#ec4899",
  footer: "#6b7280",
};

export const DraggableInvoiceCanvas = ({ settings, onPositionChange }: DraggableInvoiceCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Record<string, ElementPosition>>(
    settings.elementPositions || defaultElementPositions
  );
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lockedElements, setLockedElements] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (settings.elementPositions) {
      setPositions(settings.elementPositions);
    }
  }, [settings.elementPositions]);

  const getCanvasSize = () => {
    if (!canvasRef.current) return { width: 600, height: 800 };
    return {
      width: canvasRef.current.offsetWidth,
      height: canvasRef.current.offsetHeight,
    };
  };

  const percentToPixels = (pos: ElementPosition) => {
    const canvas = getCanvasSize();
    return {
      x: (pos.x / 100) * canvas.width,
      y: (pos.y / 100) * canvas.height,
      width: (pos.width / 100) * canvas.width,
      height: (pos.height / 100) * canvas.height,
    };
  };

  const pixelsToPercent = (x: number, y: number, width?: number, height?: number) => {
    const canvas = getCanvasSize();
    return {
      x: Math.max(0, Math.min(100, (x / canvas.width) * 100)),
      y: Math.max(0, Math.min(100, (y / canvas.height) * 100)),
      width: width ? Math.max(10, Math.min(100, (width / canvas.width) * 100)) : undefined,
      height: height ? Math.max(5, Math.min(50, (height / canvas.height) * 100)) : undefined,
    };
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, element: string, isResize = false) => {
    if (lockedElements.has(element)) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedElement(element);
    
    if (isResize) {
      setIsResizing(true);
    } else {
      setIsDragging(true);
    }
    
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [lockedElements]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!selectedElement || (!isDragging && !isResizing)) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    const canvas = getCanvasSize();
    
    setPositions(prev => {
      const current = prev[selectedElement];
      const pixelPos = percentToPixels(current);
      
      if (isResizing) {
        const newWidth = pixelPos.width + deltaX;
        const newHeight = pixelPos.height + deltaY;
        const percentSize = pixelsToPercent(0, 0, newWidth, newHeight);
        
        return {
          ...prev,
          [selectedElement]: {
            ...current,
            width: percentSize.width || current.width,
            height: percentSize.height || current.height,
          },
        };
      } else {
        const newX = pixelPos.x + deltaX;
        const newY = pixelPos.y + deltaY;
        const percentPos = pixelsToPercent(newX, newY);
        
        return {
          ...prev,
          [selectedElement]: {
            ...current,
            x: percentPos.x,
            y: percentPos.y,
          },
        };
      }
    });
    
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [selectedElement, isDragging, isResizing, dragStart]);

  const handleMouseUp = useCallback(() => {
    if (isDragging || isResizing) {
      onPositionChange(positions);
    }
    setIsDragging(false);
    setIsResizing(false);
  }, [isDragging, isResizing, positions, onPositionChange]);

  const toggleLock = (element: string) => {
    setLockedElements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(element)) {
        newSet.delete(element);
      } else {
        newSet.add(element);
      }
      return newSet;
    });
  };

  const resetPositions = () => {
    setPositions(defaultElementPositions);
    onPositionChange(defaultElementPositions);
  };

  const renderElementContent = (element: string) => {
    const color = elementColors[element];
    
    switch (element) {
      case "header":
        return (
          <div className="text-center">
            <div className="font-bold text-sm">{settings.companyName}</div>
            <div className="text-xs opacity-70">{settings.companyAddress}</div>
          </div>
        );
      case "invoiceInfo":
        return (
          <div className="flex justify-between text-xs">
            <span>رقم: 1234</span>
            <span>التاريخ: {new Date().toLocaleDateString("ar-EG")}</span>
          </div>
        );
      case "itemsTable":
        return (
          <div className="text-xs">
            <div className="font-bold border-b pb-1 mb-1">جدول الأصناف</div>
            <div className="flex justify-between">
              <span>الصنف</span>
              <span>الكمية</span>
              <span>السعر</span>
            </div>
          </div>
        );
      case "totals":
        return (
          <div className="text-xs text-left font-bold">
            الإجمالي: 350.00
          </div>
        );
      case "notes":
        return <div className="text-xs opacity-70">ملاحظات...</div>;
      case "signatures":
        return (
          <div className="flex justify-around text-xs">
            <span>توقيع البائع</span>
            <span>توقيع المستلم</span>
          </div>
        );
      case "footer":
        return <div className="text-xs text-center opacity-70">{settings.footerText.slice(0, 30)}...</div>;
      default:
        return null;
    }
  };

  const visibleElements = settings.elementsOrder.filter(element => {
    if (element === "notes" && !settings.showNotes) return false;
    if (element === "signatures" && !settings.showSignatures) return false;
    if (element === "footer" && !settings.showFooter) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-muted p-2 rounded-lg">
        <span className="text-xs text-muted-foreground">
          اسحب العناصر لتغيير موقعها - اسحب الزاوية لتغيير الحجم
        </span>
        <Button variant="ghost" size="sm" onClick={resetPositions}>
          <RotateCcw size={14} className="ml-1" />
          إعادة تعيين
        </Button>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative bg-white border-2 border-dashed border-gray-300 rounded-lg overflow-hidden"
        style={{ 
          height: settings.paperSize === "thermal" ? "400px" : "500px",
          cursor: isDragging ? "grabbing" : "default",
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: "linear-gradient(to right, #888 1px, transparent 1px), linear-gradient(to bottom, #888 1px, transparent 1px)",
            backgroundSize: "10% 10%",
          }}
        />

        {/* Draggable elements */}
        {visibleElements.map(element => {
          const pos = positions[element] || defaultElementPositions[element];
          const pixelPos = percentToPixels(pos);
          const isSelected = selectedElement === element;
          const isLocked = lockedElements.has(element);
          const color = elementColors[element];

          return (
            <div
              key={element}
              className={`absolute transition-shadow ${
                isSelected ? "ring-2 ring-primary shadow-lg z-10" : ""
              } ${isLocked ? "opacity-60" : ""}`}
              style={{
                left: pixelPos.x,
                top: pixelPos.y,
                width: pixelPos.width,
                height: pixelPos.height,
                backgroundColor: `${color}15`,
                border: `2px solid ${color}`,
                borderRadius: "4px",
                cursor: isLocked ? "not-allowed" : isDragging && isSelected ? "grabbing" : "grab",
              }}
              onMouseDown={(e) => handleMouseDown(e, element)}
              onClick={() => setSelectedElement(element)}
            >
              {/* Element label */}
              <div
                className="absolute -top-5 right-0 text-xs px-1.5 py-0.5 rounded-t text-white flex items-center gap-1"
                style={{ backgroundColor: color }}
              >
                <Move size={10} />
                {elementLabels[element]}
                <button
                  className="ml-1 hover:opacity-80"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLock(element);
                  }}
                >
                  {isLocked ? <Lock size={10} /> : <Unlock size={10} />}
                </button>
              </div>

              {/* Element content preview */}
              <div className="p-2 h-full overflow-hidden" style={{ color }}>
                {renderElementContent(element)}
              </div>

              {/* Resize handle */}
              {!isLocked && (
                <div
                  className="absolute bottom-0 left-0 w-4 h-4 cursor-se-resize flex items-center justify-center"
                  style={{ backgroundColor: color }}
                  onMouseDown={(e) => handleMouseDown(e, element, true)}
                >
                  <Maximize2 size={10} className="text-white rotate-90" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Element list */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        {visibleElements.map(element => {
          const pos = positions[element];
          const isLocked = lockedElements.has(element);
          
          return (
            <div
              key={element}
              className={`p-2 rounded border-2 cursor-pointer transition-all ${
                selectedElement === element ? "border-primary bg-primary/5" : "border-transparent bg-muted"
              }`}
              style={{ borderColor: selectedElement === element ? elementColors[element] : undefined }}
              onClick={() => setSelectedElement(element)}
            >
              <div className="font-medium flex items-center gap-1">
                {isLocked && <Lock size={10} />}
                {elementLabels[element]}
              </div>
              <div className="text-muted-foreground">
                {Math.round(pos?.x || 0)}%, {Math.round(pos?.y || 0)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
