import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const DeleteAllProducts = () => {
  const { user, tenant } = useAuth();
  const queryClient = useQueryClient();
  
  const [open, setOpen] = useState(false);
  const [confirmCode, setConfirmCode] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!confirmCode.trim()) {
      setError("أدخل كود التأكيد");
      return;
    }

    // Use verify_user_login function to verify code
    const { data: verifyResult, error: verifyError } = await supabase
      .rpc('verify_user_login', { p_access_code: confirmCode.trim() });
    
    if (verifyError || !verifyResult?.[0] || verifyResult[0].user_id !== user?.id) {
      setError("كود التأكيد غير صحيح");
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      // Delete all products for this tenant
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("tenant_id", tenant?.id);

      if (deleteError) throw deleteError;

      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("تم حذف جميع المنتجات بنجاح");
      handleClose();
    } catch (err) {
      console.error("Delete all products error:", err);
      toast.error("فشل في حذف المنتجات");
      setError("حدث خطأ أثناء الحذف");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setConfirmCode("");
    setError("");
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2"
      >
        <Trash2 size={16} />
        حذف الكل
      </Button>

      <AlertDialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              تحذير: حذف جميع المنتجات
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="text-foreground font-medium">
                هذا الإجراء سيحذف جميع المنتجات نهائياً ولا يمكن التراجع عنه!
              </p>
              <p>
                للتأكيد، أدخل كود الدخول الخاص بك:
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="confirmCode">كود التأكيد</Label>
            <Input
              id="confirmCode"
              type="password"
              value={confirmCode}
              onChange={(e) => {
                setConfirmCode(e.target.value);
                setError("");
              }}
              placeholder="أدخل كود الدخول الخاص بك"
              className="font-mono"
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={handleClose}>إلغاء</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || !confirmCode.trim()}
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} className="ml-2 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 size={16} className="ml-2" />
                  حذف جميع المنتجات
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
