import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LogoUploaderProps {
  currentLogo: string;
  onLogoChange: (url: string) => void;
  tenantId?: string;
}

export const LogoUploader = ({ currentLogo, onLogoChange, tenantId }: LogoUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentLogo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار صورة فقط");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن يكون أقل من 2 ميجابايت");
      return;
    }

    setIsUploading(true);

    try {
      // Create a unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${tenantId || "temp"}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("company-logos")
        .getPublicUrl(filePath);

      setPreviewUrl(publicUrl);
      onLogoChange(publicUrl);
      toast.success("تم رفع الشعار بنجاح");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(`خطأ في رفع الشعار: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setPreviewUrl("");
    onLogoChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="logo-upload"
      />

      {previewUrl ? (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt="شعار الشركة"
            className="h-20 w-auto rounded-lg border border-border object-contain bg-white p-2"
          />
          <button
            type="button"
            onClick={handleRemoveLogo}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:opacity-80 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label
          htmlFor="logo-upload"
          className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors ${
            isUploading ? "opacity-50 cursor-wait" : ""
          }`}
        >
          {isUploading ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <>
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">اضغط لرفع الشعار</span>
              <span className="text-xs text-muted-foreground/70">PNG, JPG حتى 2MB</span>
            </>
          )}
        </label>
      )}

      {!previewUrl && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full py-2 px-4 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          {isUploading ? "جاري الرفع..." : "اختيار صورة"}
        </button>
      )}
    </div>
  );
};
