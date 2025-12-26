// Generate a unique device fingerprint based on browser/device characteristics
export const generateDeviceId = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('device-fingerprint', 2, 2);
  }
  const canvasFingerprint = canvas.toDataURL();
  
  const screenData = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;
  const platform = navigator.platform;
  const userAgent = navigator.userAgent;
  
  // Combine all data
  const raw = `${canvasFingerprint}|${screenData}|${timezone}|${language}|${platform}|${userAgent}`;
  
  // Create a simple hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // Convert to hex and add random suffix for uniqueness
  const storedId = localStorage.getItem('device_id');
  if (storedId) {
    return storedId;
  }
  
  const newId = `DEV-${Math.abs(hash).toString(16).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  localStorage.setItem('device_id', newId);
  return newId;
};

export const getStoredDeviceId = (): string | null => {
  return localStorage.getItem('device_id');
};

export const clearDeviceId = () => {
  localStorage.removeItem('device_id');
};
