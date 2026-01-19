import { useState, useCallback, memo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Download, 
  Monitor, 
  Package, 
  Loader2, 
  CheckCircle, 
  Rocket,
  Zap,
  Globe
} from "lucide-react";
import JSZip from "jszip";

interface QuickExporterProps {
  tenantName: string;
  tenantSlug: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string | null;
}

/**
 * مكون تصدير سريع بنقرة واحدة
 * يولد حزمة كاملة لتطبيق سطح المكتب
 */
export const QuickExporter = memo(({ 
  tenantName, 
  tenantSlug, 
  primaryColor = '#3b82f6',
  secondaryColor = '#8b5cf6',
  logoUrl 
}: QuickExporterProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');

  const storeUrl = `${window.location.origin}/store/${tenantSlug}`;

  const generateMainJs = useCallback(() => {
    return `const { app, BrowserWindow, Menu, shell, nativeTheme } = require('electron');
const path = require('path');

// تحسين الأداء
app.commandLine.appendSwitch('disable-gpu-vsync');
app.commandLine.appendSwitch('disable-frame-rate-limit');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

let mainWindow;
let splashWindow;

// نافذة التحميل
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    center: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });

  splashWindow.loadURL(\`data:text/html,
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          border-radius: 16px;
        }
        .container { text-align: center; }
        .logo { font-size: 48px; margin-bottom: 16px; }
        .name { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
        .loading { font-size: 14px; opacity: 0.8; }
        .dots::after {
          content: '';
          animation: dots 1.5s infinite;
        }
        @keyframes dots {
          0%, 20% { content: '.'; }
          40% { content: '..'; }
          60%, 100% { content: '...'; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">${tenantName.charAt(0).toUpperCase()}</div>
        <div class="name">${tenantName}</div>
        <div class="loading">جاري التحميل<span class="dots"></span></div>
      </div>
    </body>
    </html>
  \`);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: '${tenantName}',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      spellcheck: false,
      enableWebSQL: false,
    },
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f172a' : '#ffffff',
    titleBarStyle: 'hiddenInset',
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadURL('${storeUrl}');

  // تحسين الذاكرة
  mainWindow.webContents.on('did-finish-load', () => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
    
    // تنظيف الذاكرة
    mainWindow.webContents.session.clearCache();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // تحسين الأداء عند التصغير
  mainWindow.on('minimize', () => {
    mainWindow.webContents.setBackgroundThrottling(true);
  });

  mainWindow.on('restore', () => {
    mainWindow.webContents.setBackgroundThrottling(false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createSplashWindow();
  setTimeout(createWindow, 500);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// تنظيف الذاكرة بشكل دوري
setInterval(() => {
  if (global.gc) global.gc();
}, 60000);
`;
  }, [storeUrl, tenantName, primaryColor, secondaryColor]);

  const generatePackageJson = useCallback(() => {
    return JSON.stringify({
      name: tenantSlug,
      productName: tenantName,
      version: "1.0.0",
      description: `تطبيق ${tenantName} لسطح المكتب`,
      main: "main.js",
      author: tenantName,
      license: "MIT",
      scripts: {
        start: "electron .",
        build: "electron-builder",
        "build:win": "electron-builder --win --x64",
        "build:win32": "electron-builder --win --ia32",
        "build:mac": "electron-builder --mac",
        "build:linux": "electron-builder --linux",
        postinstall: "electron-builder install-app-deps"
      },
      devDependencies: {
        electron: "^28.0.0",
        "electron-builder": "^24.9.1"
      },
      build: {
        appId: `com.${tenantSlug}.app`,
        productName: tenantName,
        compression: "maximum",
        directories: { output: "dist" },
        files: ["main.js", "preload.js", "assets/**/*"],
        win: {
          target: [
            { target: "nsis", arch: ["x64"] },
            { target: "portable", arch: ["x64"] }
          ],
          icon: "assets/icon.ico",
          publisherName: tenantName,
          requestedExecutionLevel: "asInvoker"
        },
        nsis: {
          oneClick: true,
          perMachine: false,
          allowToChangeInstallationDirectory: false,
          installerIcon: "assets/icon.ico",
          createDesktopShortcut: true,
          createStartMenuShortcut: true,
          shortcutName: tenantName,
          language: 1025,
          runAfterFinish: true
        },
        portable: {
          artifactName: `${tenantSlug}-portable.exe`
        },
        mac: {
          target: ["dmg"],
          icon: "assets/icon.icns",
          category: "public.app-category.business"
        },
        linux: {
          target: ["AppImage"],
          icon: "assets/icon.png",
          category: "Office"
        }
      }
    }, null, 2);
  }, [tenantName, tenantSlug]);

  const generateBuildScript = useCallback(() => {
    return `@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════╗
echo ║     بناء تطبيق ${tenantName.padEnd(25)}      ║
echo ╚══════════════════════════════════════════════╝
echo.

echo [1/3] تثبيت الحزم المطلوبة...
call npm install --legacy-peer-deps

if %ERRORLEVEL% NEQ 0 (
    echo ❌ فشل تثبيت الحزم
    pause
    exit /b 1
)

echo.
echo [2/3] بناء التطبيق...
call npm run build:win

if %ERRORLEVEL% NEQ 0 (
    echo ❌ فشل بناء التطبيق
    pause
    exit /b 1
)

echo.
echo ╔══════════════════════════════════════════════╗
echo ║     ✅ تم بناء التطبيق بنجاح!                ║
echo ║                                              ║
echo ║     الملفات في مجلد dist                    ║
echo ╚══════════════════════════════════════════════╝
echo.

start dist
pause
`;
  }, [tenantName]);

  const generateOneClickInstaller = useCallback(() => {
    return `@echo off
chcp 65001 >nul
title تثبيت ${tenantName}

:: التحقق من Node.js
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js غير مثبت!
    echo.
    echo يرجى تحميل وتثبيت Node.js من:
    echo https://nodejs.org/
    echo.
    start https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo ╔══════════════════════════════════════════════╗
echo ║       تثبيت تطبيق ${tenantName.padEnd(22)}        ║
echo ╚══════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo [1/3] تثبيت الحزم...
call npm install --legacy-peer-deps --silent

echo [2/3] بناء التطبيق...
call npm run build:win

echo [3/3] تشغيل المثبت...
for %%f in (dist\\*.exe) do (
    if not "%%~nf"=="${tenantSlug}-portable" (
        start "" "%%f"
        goto :done
    )
)

:done
echo.
echo ✅ تم!
timeout /t 3
`;
  }, [tenantName, tenantSlug]);

  const handleQuickExport = useCallback(async () => {
    setIsExporting(true);
    setProgress(0);
    
    try {
      const zip = new JSZip();
      const appFolder = zip.folder(`${tenantSlug}-app`);
      
      if (!appFolder) throw new Error("Failed to create folder");

      // Stage 1: Core files
      setStage('إنشاء الملفات الأساسية...');
      setProgress(20);
      await new Promise(r => setTimeout(r, 100));
      
      appFolder.file("main.js", generateMainJs());
      appFolder.file("package.json", generatePackageJson());
      
      // Stage 2: Build scripts
      setStage('إنشاء ملفات البناء...');
      setProgress(40);
      await new Promise(r => setTimeout(r, 100));
      
      appFolder.file("build.bat", generateBuildScript());
      appFolder.file("install.bat", generateOneClickInstaller());
      appFolder.file("preload.js", `// Preload script
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron
});`);
      
      // Stage 3: Assets
      setStage('إنشاء الأصول...');
      setProgress(60);
      await new Promise(r => setTimeout(r, 100));
      
      const assetsFolder = appFolder.folder("assets");
      if (assetsFolder) {
        const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${secondaryColor};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#grad)" filter="url(#shadow)"/>
  <text x="256" y="320" font-size="240" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">${tenantName.charAt(0).toUpperCase()}</text>
</svg>`;
        assetsFolder.file("icon.svg", iconSvg);
        assetsFolder.file("README.txt", `ضع ملفات الأيقونات هنا:
- icon.ico (256x256) - لويندوز
- icon.png (512x512) - للنظام

يمكنك تحويل icon.svg إلى ico من:
https://convertio.co/svg-ico/`);
      }
      
      // Stage 4: README
      setStage('إنشاء التوثيق...');
      setProgress(80);
      await new Promise(r => setTimeout(r, 100));
      
      appFolder.file("README.md", `# ${tenantName} - تطبيق سطح المكتب

## 🚀 التثبيت السريع (نقرة واحدة)

1. انقر مرتين على \`install.bat\`
2. انتظر اكتمال البناء
3. سيفتح المثبت تلقائياً

## 📦 رابط المتجر
${storeUrl}

## 💡 ملاحظات
- التطبيق يتطلب اتصال بالإنترنت
- يعمل على Windows, macOS, Linux
`);
      
      // Stage 5: Generate ZIP
      setStage('ضغط الملفات...');
      setProgress(90);
      
      const content = await zip.generateAsync({ 
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 9 }
      });
      
      // Download
      setProgress(100);
      setStage('جاري التحميل...');
      
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tenantSlug}-app.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("تم تصدير التطبيق بنجاح! 🎉");
      
    } catch (error) {
      console.error("Export error:", error);
      toast.error("حدث خطأ أثناء التصدير");
    } finally {
      setIsExporting(false);
      setProgress(0);
      setStage('');
    }
  }, [tenantSlug, generateMainJs, generatePackageJson, generateBuildScript, generateOneClickInstaller, storeUrl, tenantName, primaryColor, secondaryColor]);

  return (
    <Card 
      className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group overflow-hidden"
      onClick={!isExporting ? handleQuickExport : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground group-hover:scale-110 transition-transform">
              {isExporting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Rocket className="h-6 w-6" />
              )}
            </div>
            {!isExporting && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold flex items-center gap-2">
              <span>تصدير التطبيق</span>
              <Zap className="h-4 w-4 text-yellow-500" />
            </h4>
            
            {isExporting ? (
              <div className="space-y-2 mt-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">{stage}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground truncate">
                نقرة واحدة لإنشاء حزمة التطبيق الكاملة
              </p>
            )}
          </div>
          
          {!isExporting && (
            <Download className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </div>
      </CardContent>
    </Card>
  );
});

QuickExporter.displayName = 'QuickExporter';

export default QuickExporter;
