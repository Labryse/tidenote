export type Platform = 'windows' | 'mac' | 'linux' | 'android' | 'ios' | 'unknown';

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Mac/i.test(ua) && !/Mobile/i.test(ua)) return 'mac';
  if (/Win/i.test(ua)) return 'windows';
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return 'linux';
  return 'unknown';
}

export function getPlatformLabel(platform: Platform): string {
  const labels: Record<Platform, string> = {
    windows: 'Windows için İndir',
    mac: 'Mac için İndir',
    linux: 'Linux için İndir',
    android: "Android'e İndir",
    ios: "Çok Yakında - iOS",
    unknown: 'İndir'
  };
  return labels[platform];
}

export function getPlatformIcon(platform: Platform): string {
  const icons: Record<Platform, string> = {
    windows: 'Monitor',
    mac: 'Apple',
    linux: 'Terminal',
    android: 'Smartphone',
    ios: 'Smartphone',
    unknown: 'Laptop'
  };
  return icons[platform] || 'Laptop';
}

export function isWebOnly(): boolean {
  // Capacitor kontrolü
  const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();
  // Electron kontrolü
  const isElectron = !!(window as any).electronAPI || navigator.userAgent.includes('Electron');
  return !isCapacitor && !isElectron;
}

