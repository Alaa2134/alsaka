import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, Sparkles, X, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProductImageUploaderProps {
  currentImageUrl?: string | null;
  onImageUploaded: (url: string) => void;
  productName?: string;
}

export const ProductImageUploader = ({
  currentImageUrl,
  onImageUploaded,
  productName = "منتج"
}: ProductImageUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating3D, setIsGenerating3D] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase storage
      const { error: uploadError, data } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: publicUrl } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      const imageUrl = publicUrl.publicUrl;
      setPreviewUrl(imageUrl);

      // Auto-generate 3D version
      setIsGenerating3D(true);
      toast.info('جاري تحويل الصورة إلى 3D...');

      try {
        const response = await supabase.functions.invoke('generate-3d-image', {
          body: { 
            imageUrl, 
            productName 
          }
        });

        if (response.data?.success && response.data?.image3dUrl) {
          setPreviewUrl(response.data.image3dUrl);
          onImageUploaded(response.data.image3dUrl);
          toast.success(response.data.message || 'تم تحويل الصورة إلى 3D!');
        } else {
          // Use original image if 3D generation fails
          onImageUploaded(imageUrl);
          toast.info('تم رفع الصورة الأصلية');
        }
      } catch (err) {
        console.error('3D generation error:', err);
        // Use original image if 3D generation fails
        onImageUploaded(imageUrl);
        toast.info('تم رفع الصورة بنجاح');
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('فشل في رفع الصورة');
    } finally {
      setIsUploading(false);
      setIsGenerating3D(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onImageUploaded('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
        disabled={isUploading || isGenerating3D}
      />

      <AnimatePresence mode="wait">
        {previewUrl ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative group"
          >
            <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-primary/20 bg-muted">
              <img
                src={previewUrl}
                alt="صورة المنتج"
                className="w-full h-full object-cover"
              />
              
              {isGenerating3D && (
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="h-8 w-8 text-primary" />
                  </motion.div>
                  <p className="text-sm text-primary font-medium">جاري التحويل لـ 3D...</p>
                </div>
              )}

              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleRemoveImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isGenerating3D}
                >
                  <Upload className="h-4 w-4" />
                  تغيير الصورة
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Button
              type="button"
              variant="outline"
              className="w-full h-32 flex flex-col gap-2 border-dashed border-2 hover:border-primary hover:bg-primary/5"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">جاري الرفع...</span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">اضغط لرفع صورة</span>
                  <span className="text-xs text-primary">سيتم تحويلها تلقائياً لـ 3D</span>
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
