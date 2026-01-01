import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Store, Copy, ExternalLink, QrCode } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const StoreLinkCard = () => {
  const { tenant, companySettings } = useAuth();
  const [showQR, setShowQR] = useState(false);

  if (!tenant) return null;

  const storeUrl = `${window.location.origin}/store/${tenant.slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(storeUrl);
    toast.success("تم نسخ رابط المتجر");
  };

  const handleOpen = () => {
    window.open(storeUrl, "_blank");
  };

  const isBlocked = companySettings?.store_access_blocked;
  const subscriptionType = companySettings?.subscription_type || "free";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                رابط المتجر
              </div>
              <div className="flex gap-2">
                <Badge variant={isBlocked ? "destructive" : "default"}>
                  {isBlocked ? "محظور" : subscriptionType === "pro" ? "Pro" : "مجاني"}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={storeUrl}
                readOnly
                className="font-mono text-sm bg-muted"
                dir="ltr"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                title="نسخ الرابط"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="default"
                className="flex-1 gap-2"
                onClick={handleOpen}
              >
                <ExternalLink className="h-4 w-4" />
                فتح المتجر
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShowQR(true)}
              >
                <QrCode className="h-4 w-4" />
                QR Code
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              شارك هذا الرابط مع عملائك للوصول لمتجرك
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">QR Code للمتجر</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-4 rounded-xl">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(storeUrl)}`}
                alt="Store QR Code"
                className="w-48 h-48"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              امسح الكود للوصول للمتجر
            </p>
            <p className="text-xs font-mono text-center break-all" dir="ltr">
              {storeUrl}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
