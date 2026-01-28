import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface InvoiceLayoutSection {
  id: string;
  name: string;
  nameAr: string;
  visible: boolean;
  order: number;
}

export interface InvoicePageLayoutSettings {
  sections: InvoiceLayoutSection[];
  showBarcodeScanner: boolean;
  showWhatsAppStatus: boolean;
  showAutosaveIndicator: boolean;
  compactMode: boolean;
  headerStyle: "default" | "minimal" | "expanded";
  tableStyle: "default" | "compact" | "spacious";
  footerPosition: "bottom" | "side";
}

const DEFAULT_LAYOUT: InvoicePageLayoutSettings = {
  sections: [
    { id: "header", name: "Invoice Header", nameAr: "رأس الفاتورة", visible: true, order: 1 },
    { id: "barcode", name: "Barcode Scanner", nameAr: "ماسح الباركود", visible: true, order: 2 },
    { id: "table", name: "Items Table", nameAr: "جدول الأصناف", visible: true, order: 3 },
    { id: "footer", name: "Invoice Footer", nameAr: "تذييل الفاتورة", visible: true, order: 4 },
  ],
  showBarcodeScanner: true,
  showWhatsAppStatus: true,
  showAutosaveIndicator: true,
  compactMode: false,
  headerStyle: "default",
  tableStyle: "default",
  footerPosition: "bottom",
};

const STORAGE_KEY = "invoice_page_layout";

export const useInvoicePageLayout = () => {
  const { tenant } = useAuth();
  const [settings, setSettings] = useState<InvoicePageLayoutSettings>(DEFAULT_LAYOUT);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Try to load from localStorage first (for quick access)
        const localSettings = localStorage.getItem(`${STORAGE_KEY}_${tenant?.id}`);
        if (localSettings) {
          const parsed = JSON.parse(localSettings);
          setSettings({ ...DEFAULT_LAYOUT, ...parsed });
        }

        // Then try to load from database for persistence across devices
        if (tenant?.id) {
          const { data, error } = await supabase
            .from("invoice_templates")
            .select("settings")
            .eq("tenant_id", tenant.id)
            .eq("name", "__page_layout__")
            .single();

          if (data && !error) {
            const dbSettings = data.settings as unknown as InvoicePageLayoutSettings;
            if (dbSettings) {
              setSettings({ ...DEFAULT_LAYOUT, ...dbSettings });
              // Update localStorage
              localStorage.setItem(`${STORAGE_KEY}_${tenant.id}`, JSON.stringify(dbSettings));
            }
          }
        }
      } catch (e) {
        console.error("Failed to load invoice page layout:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [tenant?.id]);

  // Save settings
  const saveSettings = async (newSettings: InvoicePageLayoutSettings) => {
    setSettings(newSettings);
    
    // Save to localStorage immediately
    localStorage.setItem(`${STORAGE_KEY}_${tenant?.id}`, JSON.stringify(newSettings));

    // Save to database for persistence
    if (tenant?.id) {
      try {
        const { data: existing } = await supabase
          .from("invoice_templates")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("name", "__page_layout__")
          .single();

        if (existing) {
          await supabase
            .from("invoice_templates")
            .update({ settings: JSON.parse(JSON.stringify(newSettings)) })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("invoice_templates")
            .insert([{
              tenant_id: tenant.id,
              name: "__page_layout__",
              settings: JSON.parse(JSON.stringify(newSettings)),
              is_default: false,
            }]);
        }
      } catch (e) {
        console.error("Failed to save invoice page layout to database:", e);
      }
    }
  };

  const resetToDefault = () => {
    saveSettings(DEFAULT_LAYOUT);
  };

  const updateSection = (sectionId: string, updates: Partial<InvoiceLayoutSection>) => {
    const newSections = settings.sections.map(section =>
      section.id === sectionId ? { ...section, ...updates } : section
    );
    saveSettings({ ...settings, sections: newSections });
  };

  const reorderSections = (newOrder: InvoiceLayoutSection[]) => {
    saveSettings({ ...settings, sections: newOrder });
  };

  const getSortedSections = () => {
    return [...settings.sections].sort((a, b) => a.order - b.order);
  };

  return {
    settings,
    isLoading,
    saveSettings,
    resetToDefault,
    updateSection,
    reorderSections,
    getSortedSections,
  };
};
