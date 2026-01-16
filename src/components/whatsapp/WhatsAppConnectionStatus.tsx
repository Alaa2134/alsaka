import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wifi, 
  WifiOff, 
  QrCode, 
  RefreshCw,
  AlertTriangle,
  Check,
  MessageCircle,
  Smartphone
} from "lucide-react";
import { useWhatsAppSettings, useSaveWhatsAppSettings } from "@/hooks/useWhatsAppSettings";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WhatsAppConnectionStatusProps {
  compact?: boolean;
  onStatusChange?: (status: 'connected' | 'disconnected' | 'connecting') => void;
}

export const WhatsAppConnectionStatus = ({ 
  compact = false,
  onStatusChange 
}: WhatsAppConnectionStatusProps) => {
  const { data: settings, isLoading } = useWhatsAppSettings();
  const saveSettings = useSaveWhatsAppSettings();
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectionStatus = settings?.connection_status || 'disconnected';
  const whatsappNumber = settings?.whatsapp_number || '';

  useEffect(() => {
    onStatusChange?.(connectionStatus as 'connected' | 'disconnected' | 'connecting');
  }, [connectionStatus, onStatusChange]);

  const handleConnect = async () => {
    if (!whatsappNumber) {
      toast.error("يرجى إضافة رقم الواتساب أولاً من إعدادات الواتساب");
      return;
    }

    setIsConnecting(true);
    
    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Update connection status to connecting
    await saveSettings.mutateAsync({
      connection_status: 'connecting',
      qr_session_id: sessionId,
    });

    // Open WhatsApp Web in a new tab
    const cleanPhone = whatsappNumber.replace(/\D/g, "");
    window.open(`https://wa.me/${cleanPhone}`, "_blank");
    
    // Show QR dialog
    setShowQRDialog(true);
    setIsConnecting(false);
  };

  const handleConfirmConnection = async () => {
    await saveSettings.mutateAsync({
      connection_status: 'connected',
      is_verified: true,
      last_connected_at: new Date().toISOString(),
    });
    setShowQRDialog(false);
    toast.success("تم تأكيد اتصال الواتساب بنجاح!");
  };

  const handleDisconnect = async () => {
    await saveSettings.mutateAsync({
      connection_status: 'disconnected',
      last_disconnected_at: new Date().toISOString(),
    });
    toast.info("تم قطع اتصال الواتساب");
  };

  const qrCodeUrl = whatsappNumber 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://wa.me/${whatsappNumber.replace(/\D/g, "")}`)}`
    : "";

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm">جاري التحميل...</span>
      </div>
    );
  }

  if (compact) {
    return (
      <>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2"
        >
          {connectionStatus === 'connected' ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-full shadow-lg shadow-green-500/30"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Wifi className="h-4 w-4" />
              </motion.div>
              <span className="font-bold text-sm">واتساب متصل</span>
              <Smartphone className="h-4 w-4" />
            </motion.div>
          ) : connectionStatus === 'connecting' ? (
            <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="font-medium text-sm">جاري الاتصال...</span>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-5 py-2.5 rounded-full font-bold shadow-lg shadow-green-500/30 hover:shadow-xl transition-all"
            >
              <MessageCircle className="h-5 w-5" />
              {isConnecting ? "جاري الربط..." : "ربط واتساب الآن"}
              <QrCode className="h-4 w-4" />
            </motion.button>
          )}
        </motion.div>

        <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-green-500" />
                ربط واتساب ويب
              </DialogTitle>
              <DialogDescription>
                افتح واتساب ويب على جهازك وامسح الـ QR Code
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col items-center gap-4 py-4">
              {qrCodeUrl && (
                <img 
                  src={qrCodeUrl}
                  alt="WhatsApp QR Code"
                  className="w-48 h-48 rounded-lg shadow-md border"
                />
              )}
              
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  رقم الواتساب: <span className="font-mono font-bold">{whatsappNumber}</span>
                </p>
                <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-2 rounded-lg">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs">تأكد من فتح واتساب ويب قبل التأكيد</span>
                </div>
              </div>
              
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowQRDialog(false)}
                >
                  إلغاء
                </Button>
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  onClick={handleConfirmConnection}
                >
                  <Check className="h-4 w-4 ml-1" />
                  تم الاتصال
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              connectionStatus === 'connected' 
                ? "bg-green-100 text-green-600" 
                : connectionStatus === 'connecting'
                ? "bg-yellow-100 text-yellow-600"
                : "bg-red-100 text-red-600"
            }`}>
              {connectionStatus === 'connected' ? (
                <Wifi className="h-5 w-5" />
              ) : connectionStatus === 'connecting' ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <WifiOff className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="font-medium">
                {connectionStatus === 'connected' 
                  ? "واتساب متصل" 
                  : connectionStatus === 'connecting'
                  ? "جاري الاتصال..."
                  : "واتساب غير متصل"}
              </p>
              <p className="text-sm text-muted-foreground">
                {whatsappNumber || "لم يتم إضافة رقم"}
              </p>
            </div>
          </div>
          
          {connectionStatus === 'connected' ? (
            <Button variant="outline" size="sm" onClick={handleDisconnect}>
              قطع الاتصال
            </Button>
          ) : (
            <Button 
              size="sm" 
              className="bg-green-500 hover:bg-green-600"
              onClick={handleConnect}
              disabled={isConnecting || !whatsappNumber}
            >
              <QrCode className="h-4 w-4 ml-1" />
              {isConnecting ? "جاري..." : "ربط الآن"}
            </Button>
          )}
        </div>
        
        {connectionStatus === 'disconnected' && !whatsappNumber && (
          <div className="mt-3 p-2 bg-yellow-50 rounded-lg flex items-center gap-2 text-yellow-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">يجب إضافة رقم الواتساب من إعدادات الواتساب أولاً</span>
          </div>
        )}

        <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-green-500" />
                ربط واتساب ويب
              </DialogTitle>
              <DialogDescription>
                افتح واتساب ويب على جهازك وامسح الـ QR Code
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col items-center gap-4 py-4">
              {qrCodeUrl && (
                <img 
                  src={qrCodeUrl}
                  alt="WhatsApp QR Code"
                  className="w-48 h-48 rounded-lg shadow-md border"
                />
              )}
              
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  رقم الواتساب: <span className="font-mono font-bold">{whatsappNumber}</span>
                </p>
                <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-2 rounded-lg">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs">تأكد من فتح واتساب ويب قبل التأكيد</span>
                </div>
              </div>
              
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowQRDialog(false)}
                >
                  إلغاء
                </Button>
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  onClick={handleConfirmConnection}
                >
                  <Check className="h-4 w-4 ml-1" />
                  تم الاتصال
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};