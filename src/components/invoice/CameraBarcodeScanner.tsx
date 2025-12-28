import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface CameraBarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onBarcodeScanned: (barcode: string) => void;
}

export const CameraBarcodeScanner = ({ open, onClose, onBarcodeScanned }: CameraBarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get available cameras
  const getCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === "videoinput");
      setCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCamera) {
        // Prefer back camera
        const backCamera = videoDevices.find(d => 
          d.label.toLowerCase().includes("back") || 
          d.label.toLowerCase().includes("rear") ||
          d.label.toLowerCase().includes("خلفي")
        );
        setSelectedCamera(backCamera?.deviceId || videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error("Error getting cameras:", err);
    }
  };

  // Start camera
  const startCamera = async () => {
    try {
      setError(null);
      
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          facingMode: selectedCamera ? undefined : { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);
        startBarcodeDetection();
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setError(err.name === "NotAllowedError" 
        ? "يرجى السماح بالوصول إلى الكاميرا" 
        : "فشل تشغيل الكاميرا");
      setIsScanning(false);
    }
  };

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Barcode detection using BarcodeDetector API (if available)
  const startBarcodeDetection = () => {
    if (!("BarcodeDetector" in window)) {
      // Fallback: prompt user to enter manually
      console.log("BarcodeDetector not supported, using manual fallback");
      return;
    }

    const barcodeDetector = new (window as any).BarcodeDetector({
      formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"]
    });

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !isScanning) return;

      try {
        const barcodes = await barcodeDetector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const barcode = barcodes[0].rawValue;
          toast.success(`تم مسح: ${barcode}`);
          onBarcodeScanned(barcode);
          stopCamera();
          onClose();
        }
      } catch (err) {
        // Ignore detection errors
      }
    }, 200);
  };

  // Handle manual barcode input
  const [manualBarcode, setManualBarcode] = useState("");
  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      onBarcodeScanned(manualBarcode.trim());
      stopCamera();
      onClose();
    }
  };

  // Initialize on open
  useEffect(() => {
    if (open) {
      getCameras();
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => stopCamera();
  }, [open, stopCamera]);

  // Switch camera
  useEffect(() => {
    if (open && selectedCamera) {
      startCamera();
    }
  }, [selectedCamera]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera size={20} />
            مسح الباركود بالكاميرا
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera preview */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Scanning overlay */}
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-32 border-2 border-primary rounded-lg animate-pulse" />
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-center text-white p-4">
                  <CameraOff size={48} className="mx-auto mb-2 text-destructive" />
                  <p>{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Camera selector */}
          {cameras.length > 1 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                {cameras.map((camera, i) => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `كاميرا ${i + 1}`}
                  </option>
                ))}
              </select>
              <Button size="icon" variant="outline" onClick={startCamera}>
                <RefreshCw size={16} />
              </Button>
            </div>
          )}

          {/* Manual input fallback */}
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">
              أو أدخل الباركود يدوياً:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="أدخل الباركود..."
                className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm font-mono"
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
              />
              <Button onClick={handleManualSubmit} disabled={!manualBarcode.trim()}>
                إضافة
              </Button>
            </div>
          </div>

          {/* Browser support note */}
          {!("BarcodeDetector" in window) && (
            <p className="text-xs text-warning text-center">
              متصفحك لا يدعم المسح التلقائي. استخدم الإدخال اليدوي.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
