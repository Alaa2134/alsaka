import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Download, Monitor, FileCode, Package, Loader2, CheckCircle, Copy } from "lucide-react";
import { Tenant } from "@/contexts/AuthContext";
import JSZip from "jszip";

interface ElectronExporterProps {
  tenant: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ElectronExporter = ({ tenant, open, onOpenChange }: ElectronExporterProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!tenant) return null;

  const storeUrl = `${window.location.origin}/store/${tenant.slug}`;

  const generateMainJs = () => {
    return `const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

// Disable hardware acceleration for better compatibility
app.disableHardwareAcceleration();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: '${tenant.name}',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    show: false,
    backgroundColor: '#0f172a',
  });

  // Hide menu bar
  Menu.setApplicationMenu(null);

  // Load the store URL
  mainWindow.loadURL('${storeUrl}');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
`;
  };

  const generatePackageJson = () => {
    return JSON.stringify({
      name: tenant.slug,
      productName: tenant.name,
      version: "1.0.0",
      description: `تطبيق ${tenant.name} لسطح المكتب`,
      main: "main.js",
      author: tenant.name,
      license: "MIT",
      scripts: {
        start: "electron .",
        "build": "electron-builder",
        "build:win": "electron-builder --win",
        "build:mac": "electron-builder --mac",
        "build:linux": "electron-builder --linux",
        "build:all": "electron-builder -mwl"
      },
      devDependencies: {
        electron: "^28.0.0",
        "electron-builder": "^24.9.1"
      },
      build: {
        appId: `com.${tenant.slug}.app`,
        productName: tenant.name,
        directories: {
          output: "dist"
        },
        files: [
          "main.js",
          "preload.js",
          "assets/**/*"
        ],
        win: {
          target: [
            {
              target: "nsis",
              arch: ["x64", "ia32"]
            },
            {
              target: "portable",
              arch: ["x64"]
            }
          ],
          icon: "assets/icon.ico",
          publisherName: tenant.name
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true,
          installerIcon: "assets/icon.ico",
          uninstallerIcon: "assets/icon.ico",
          installerHeaderIcon: "assets/icon.ico",
          createDesktopShortcut: true,
          createStartMenuShortcut: true,
          shortcutName: tenant.name,
          language: 1025
        },
        portable: {
          artifactName: "${tenant.slug}-portable.exe"
        },
        mac: {
          target: ["dmg", "zip"],
          icon: "assets/icon.icns",
          category: "public.app-category.business"
        },
        linux: {
          target: ["AppImage", "deb"],
          icon: "assets/icon.png",
          category: "Office"
        }
      }
    }, null, 2);
  };

  const generatePreloadJs = () => {
    return `// Preload script for security
const { contextBridge } = require('electron');

// Expose safe APIs to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron
});
`;
  };

  const generateReadme = () => {
    return `# ${tenant.name} - تطبيق سطح المكتب

## 📥 المتطلبات
- Node.js 18 أو أحدث
- npm أو yarn

## 🚀 التثبيت السريع

\`\`\`bash
# تثبيت الحزم
npm install

# تشغيل التطبيق للتجربة
npm start

# بناء ملف EXE لويندوز
npm run build:win
\`\`\`

## 📦 ملفات الإخراج

بعد البناء، ستجد الملفات في مجلد \`dist\`:
- \`${tenant.name} Setup 1.0.0.exe\` - ملف التثبيت
- \`${tenant.slug}-portable.exe\` - نسخة محمولة (لا تحتاج تثبيت)

## 🎨 تخصيص الأيقونة

استبدل ملفات الأيقونات في مجلد \`assets\`:
- \`icon.ico\` - لويندوز (256x256 pixels)
- \`icon.icns\` - لـ macOS
- \`icon.png\` - لـ Linux (512x512 pixels)

## 📌 معلومات التطبيق

- **الاسم**: ${tenant.name}
- **رابط المتجر**: ${storeUrl}
- **اللون الرئيسي**: ${tenant.primary_color}
- **اللون الثانوي**: ${tenant.secondary_color}

## 💡 ملاحظات

- التطبيق يتطلب اتصال بالإنترنت للعمل
- يمكن تشغيله على Windows, macOS, و Linux
- للحصول على أيقونة مخصصة، استخدم أداة مثل https://icoconvert.com
`;
  };

  const generateBuildBat = () => {
    return `@echo off
echo ================================
echo بناء تطبيق ${tenant.name}
echo ================================
echo.

echo [1/3] تثبيت الحزم...
call npm install

echo.
echo [2/3] بناء التطبيق...
call npm run build:win

echo.
echo [3/3] اكتمل البناء!
echo.
echo ================================
echo الملفات جاهزة في مجلد dist
echo ================================
pause
`;
  };

  const handleExportComplete = async () => {
    setIsExporting(true);
    
    try {
      const zip = new JSZip();
      const appFolder = zip.folder(`${tenant.slug}-desktop-app`);
      
      if (!appFolder) throw new Error("Failed to create folder");

      // Add main files
      appFolder.file("main.js", generateMainJs());
      appFolder.file("package.json", generatePackageJson());
      appFolder.file("preload.js", generatePreloadJs());
      appFolder.file("README.md", generateReadme());
      appFolder.file("build.bat", generateBuildBat());

      // Create assets folder with placeholder
      const assetsFolder = appFolder.folder("assets");
      if (assetsFolder) {
        // Add a simple SVG icon as placeholder
        const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${tenant.primary_color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${tenant.secondary_color};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="40" fill="url(#grad)"/>
  <text x="128" y="150" font-size="120" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">${tenant.name.charAt(0).toUpperCase()}</text>
</svg>`;
        assetsFolder.file("icon.svg", iconSvg);
        assetsFolder.file("ICON_README.txt", `ضع ملفات الأيقونات هنا:
- icon.ico (256x256) - لويندوز
- icon.icns - لـ macOS  
- icon.png (512x512) - لـ Linux

يمكنك تحويل أي صورة إلى ico من خلال:
https://icoconvert.com
https://convertio.co/png-ico/
`);
      }

      // Generate the zip file
      const content = await zip.generateAsync({ type: "blob" });
      
      // Download
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tenant.slug}-desktop-app.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("تم تصدير الحزمة الكاملة بنجاح!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("حدث خطأ أثناء التصدير");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportConfig = () => {
    const config = generatePackageJson();
    const blob = new Blob([config], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tenant.slug}-package.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير ملف package.json");
  };

  const handleExportMainJs = () => {
    const mainJs = generateMainJs();
    const blob = new Blob([mainJs], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "main.js";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير ملف main.js");
  };

  const copyQuickStart = () => {
    const commands = `npm install && npm run build:win`;
    navigator.clipboard.writeText(commands);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("تم نسخ الأوامر");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            تصدير تطبيق سطح المكتب - {tenant.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Info */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground mb-2">رابط المتجر:</p>
            <code className="text-xs bg-background px-2 py-1 rounded border">{storeUrl}</code>
          </div>

          {/* Export Options */}
          <div className="grid gap-3">
            {/* Complete Package */}
            <Card 
              className="cursor-pointer hover:border-primary transition-all hover:shadow-md"
              onClick={handleExportComplete}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                  {isExporting ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Package className="h-6 w-6" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold flex items-center gap-2">
                    الحزمة الكاملة (موصى به)
                    <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
                      ZIP
                    </span>
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    كل الملفات المطلوبة جاهزة للبناء - فقط فك الضغط وشغّل build.bat
                  </p>
                </div>
                <Download className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            {/* Individual Files */}
            <div className="grid grid-cols-2 gap-3">
              <Card 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={handleExportConfig}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                    <FileCode className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">package.json</h4>
                    <p className="text-xs text-muted-foreground">إعدادات البناء</p>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={handleExportMainJs}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
                    <FileCode className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">main.js</h4>
                    <p className="text-xs text-muted-foreground">ملف Electron الرئيسي</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Quick Start */}
          <div className="border border-border rounded-lg p-4 bg-card">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              البدء السريع
            </h4>
            <ol className="text-sm space-y-2 text-muted-foreground">
              <li>1. حمّل الحزمة الكاملة وفك الضغط</li>
              <li>2. افتح المجلد في سطر الأوامر (CMD)</li>
              <li>3. نفّذ الأوامر:</li>
            </ol>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono" dir="ltr">
                npm install && npm run build:win
              </code>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyQuickStart}
                className="shrink-0"
              >
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              ستجد ملف EXE في مجلد <code className="bg-muted px-1 rounded">dist</code>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
