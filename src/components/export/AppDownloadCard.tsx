import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Monitor, 
  Apple, 
  Laptop, 
  Chrome, 
  Smartphone,
  CheckCircle,
  ExternalLink,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import JSZip from "jszip";

interface AppDownloadCardProps {
  appName?: string;
  appUrl?: string;
  compact?: boolean;
}

export const AppDownloadCard = ({ 
  appName = "نظام الفواتير", 
  appUrl = window.location.origin,
  compact = false
}: AppDownloadCardProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedType, setGeneratedType] = useState<string | null>(null);

  const generateDesktopApp = async (platform: 'windows' | 'mac' | 'linux') => {
    setIsGenerating(true);
    setGeneratedType(platform);
    
    try {
      const zip = new JSZip();
      
      // Package.json for Electron
      const packageJson = {
        name: appName.replace(/\s/g, '-').toLowerCase(),
        version: "1.0.0",
        description: appName,
        main: "main.js",
        scripts: {
          start: "electron .",
          build: "electron-builder"
        },
        build: {
          appId: `com.${appName.replace(/\s/g, '').toLowerCase()}.app`,
          productName: appName,
          directories: { output: "dist" },
          win: { target: ["nsis", "portable"], icon: "icon.ico" },
          mac: { target: ["dmg"], icon: "icon.icns" },
          linux: { target: ["AppImage", "deb"], icon: "icon.png" }
        },
        dependencies: {
          electron: "^28.0.0"
        },
        devDependencies: {
          "electron-builder": "^24.9.1"
        }
      };

      // Main Electron file
      const mainJs = `
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    titleBarStyle: 'default',
    autoHideMenuBar: false,
    show: false
  });

  // Load the app URL
  mainWindow.loadURL('${appUrl}');

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create menu
  const menu = Menu.buildFromTemplate([
    {
      label: 'ملف',
      submenu: [
        { label: 'تحديث', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
        { type: 'separator' },
        { label: 'خروج', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'تحرير',
      submenu: [
        { label: 'تراجع', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'إعادة', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'قص', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'نسخ', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'لصق', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: 'عرض',
      submenu: [
        { label: 'تكبير', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'تصغير', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'إعادة الحجم', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'ملء الشاشة', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);

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
  if (mainWindow === null) {
    createWindow();
  }
});
`;

      // Installation scripts
      const installBat = `@echo off
echo Installing ${appName} Desktop App...
echo.
call npm install
echo.
echo Installation complete!
echo Run "npm start" to launch the app
pause
`;

      const installSh = `#!/bin/bash
echo "Installing ${appName} Desktop App..."
echo
npm install
echo
echo "Installation complete!"
echo "Run 'npm start' to launch the app"
`;

      const readme = `# ${appName} - Desktop Application

## التثبيت

### Windows
1. قم بفك الضغط عن الملفات
2. شغّل ملف \`install.bat\`
3. شغّل ملف \`start.bat\` لبدء التطبيق

### Mac / Linux
1. قم بفك الضغط عن الملفات
2. افتح Terminal في المجلد
3. شغّل: \`chmod +x install.sh && ./install.sh\`
4. شغّل: \`npm start\`

## متطلبات النظام
- Node.js 18 أو أحدث
- npm أو yarn

## البناء للإنتاج
\`\`\`bash
npm run build
\`\`\`

سيتم إنشاء ملفات التثبيت في مجلد \`dist\`
`;

      // Start scripts
      const startBat = `@echo off
npm start
`;

      const startSh = `#!/bin/bash
npm start
`;

      // Add files to zip
      zip.file("package.json", JSON.stringify(packageJson, null, 2));
      zip.file("main.js", mainJs.trim());
      zip.file("README.md", readme);
      zip.file("install.bat", installBat);
      zip.file("install.sh", installSh);
      zip.file("start.bat", startBat);
      zip.file("start.sh", startSh);

      // Generate and download
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${appName.replace(/\s/g, '-')}-desktop-${platform}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`تم تنزيل تطبيق ${platform === 'windows' ? 'Windows' : platform === 'mac' ? 'Mac' : 'Linux'}`);
    } catch (error) {
      console.error("Error generating app:", error);
      toast.error("حدث خطأ أثناء إنشاء التطبيق");
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGeneratedType(null), 2000);
    }
  };

  const installPWA = async () => {
    try {
      // Check if PWA install is available
      const deferredPrompt = (window as any).deferredPrompt;
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          toast.success("تم تثبيت التطبيق بنجاح!");
        }
      } else {
        // Show manual instructions
        toast.info("افتح قائمة المتصفح واختر 'تثبيت التطبيق' أو 'إضافة للشاشة الرئيسية'");
      }
    } catch (error) {
      toast.info("افتح قائمة المتصفح واختر 'تثبيت التطبيق'");
    }
  };

  const platforms = [
    { id: 'windows', label: 'Windows', icon: Monitor, color: 'from-blue-500 to-blue-600' },
    { id: 'mac', label: 'Mac', icon: Apple, color: 'from-gray-600 to-gray-700' },
    { id: 'linux', label: 'Linux', icon: Laptop, color: 'from-orange-500 to-orange-600' },
  ];

  if (compact) {
    return (
      <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent text-white">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">تنزيل التطبيق</p>
                <p className="text-xs text-muted-foreground">كتطبيق سطح مكتب</p>
              </div>
            </div>
            <div className="flex gap-2">
              {platforms.map((platform) => (
                <Button
                  key={platform.id}
                  size="sm"
                  variant="outline"
                  onClick={() => generateDesktopApp(platform.id as any)}
                  disabled={isGenerating}
                  className="gap-1"
                >
                  {generatedType === platform.id ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <platform.icon className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{platform.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-1">
        <CardHeader className="bg-card rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent text-white">
              <Download className="h-5 w-5" />
            </div>
            تنزيل التطبيق
            <Badge variant="secondary" className="gap-1">
              <Zap className="h-3 w-3" />
              جديد
            </Badge>
          </CardTitle>
          <CardDescription>
            قم بتنزيل التطبيق على جهازك لتجربة أسرع وأفضل
          </CardDescription>
        </CardHeader>
      </div>
      
      <CardContent className="p-6 space-y-6">
        {/* Desktop Apps */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            تطبيق سطح المكتب
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {platforms.map((platform, index) => (
              <motion.div
                key={platform.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Button
                  variant="outline"
                  className="w-full h-auto flex-col gap-2 p-4 hover:scale-105 transition-all group"
                  onClick={() => generateDesktopApp(platform.id as any)}
                  disabled={isGenerating}
                >
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${platform.color} text-white group-hover:scale-110 transition-transform`}>
                    {generatedType === platform.id ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <platform.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-sm font-medium">{platform.label}</span>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* PWA Install */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Chrome className="h-4 w-4" />
            تطبيق الويب (PWA)
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4"
              onClick={installPWA}
            >
              <Chrome className="h-5 w-5 text-blue-500" />
              <span className="text-sm">تثبيت على المتصفح</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4"
              onClick={() => window.open(appUrl, '_blank')}
            >
              <ExternalLink className="h-5 w-5 text-green-500" />
              <span className="text-sm">فتح في تبويب جديد</span>
            </Button>
          </div>
        </div>

        {/* Mobile */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            على الهاتف
          </h4>
          <p className="text-sm text-muted-foreground">
            افتح الرابط على هاتفك واضغط على "إضافة للشاشة الرئيسية" من قائمة المتصفح
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
