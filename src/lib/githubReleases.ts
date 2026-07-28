import type { Platform } from './platformDetect';

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

export interface LatestRelease {
  tag_name: string;
  assets: ReleaseAsset[];
}

export async function getLatestRelease(): Promise<LatestRelease | null> {
  const CACHE_KEY = 'latest-release';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
  } catch (e) {
    // Ignore session storage error
  }

  try {
    const res = await fetch('https://api.github.com/repos/Labryse/tidenote/releases/latest');
    if (!res.ok) return null;
    const data = await res.json();
    
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (e) {
      // Ignore session storage error
    }
    
    return data;
  } catch {
    return null;
  }
}

export function findAssetForPlatform(assets: ReleaseAsset[], platform: Platform): ReleaseAsset | null {
  const patterns: Record<string, RegExp> = {
    windows: /\.exe$/i,
    mac: /\.dmg$/i,
    linux: /\.AppImage$/i,
    android: /\.apk$/i
  };
  const pattern = patterns[platform];
  if (!pattern) return null;
  return assets.find(a => pattern.test(a.name)) || null;
}
