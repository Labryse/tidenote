import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Monitor, Apple, Terminal, Smartphone, Laptop, ChevronDown, Loader2 
} from 'lucide-react';
import { detectPlatform, getPlatformIcon, isWebOnly } from '../lib/platformDetect';
import type { Platform } from '../lib/platformDetect';
import { getLatestRelease, findAssetForPlatform } from '../lib/githubReleases';
import type { LatestRelease } from '../lib/githubReleases';

const IconMap = {
  Monitor: Monitor,
  Apple: Apple,
  Terminal: Terminal,
  Smartphone: Smartphone,
  Laptop: Laptop
};

export default function DownloadButton() {
  const { i18n } = useTranslation();
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [release, setRelease] = useState<LatestRelease | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Return early if not web-only (Electron/Capacitor apps)
  if (!isWebOnly()) return null;

  const isTr = i18n.language.startsWith('tr');

  useEffect(() => {
    // Detect platform on mount
    setPlatform(detectPlatform());

    // Fetch latest release
    getLatestRelease().then((data) => {
      setRelease(data);
      setLoading(false);
    });

    // Close dropdown on click outside
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Translated dictionary
  const dict = {
    checking: isTr ? 'Kontrol ediliyor...' : 'Checking...',
    fallback: isTr ? "GitHub'dan İndir" : 'Download from GitHub',
    allPlatforms: isTr ? 'Tüm Platformlar' : 'All Platforms',
    comingSoon: isTr ? 'Çok Yakında' : 'Coming Soon',
    windowsLabel: isTr ? 'Windows için İndir' : 'Download for Windows',
    macLabel: isTr ? 'Mac OS (Çok Yakında)' : 'macOS (Coming Soon)',
    linuxLabel: isTr ? 'Linux (Çok Yakında)' : 'Linux (Coming Soon)',
    androidLabel: isTr ? 'Android (Çok Yakında)' : 'Android (Coming Soon)',
    iosLabel: isTr ? 'iOS (Çok Yakında)' : 'iOS (Coming Soon)',
    unknownLabel: isTr ? 'İndir' : 'Download'
  };

  const getPlatformText = (plat: Platform, version?: string) => {
    const versionStr = version ? ` (${version.startsWith('v') ? '' : 'v'}${version})` : '';
    switch (plat) {
      case 'windows': return `${dict.windowsLabel}${versionStr}`;
      case 'mac': return isTr ? 'Çok Yakında - macOS' : 'Coming Soon - macOS';
      case 'linux': return isTr ? 'Çok Yakında - Linux' : 'Coming Soon - Linux';
      case 'android': return isTr ? 'Çok Yakında - Android' : 'Coming Soon - Android';
      case 'ios': return isTr ? 'Çok Yakında - iOS' : 'Coming Soon - iOS';
      default: return dict.unknownLabel;
    }
  };

  const githubFallbackUrl = 'https://github.com/Labryse/tidenote/releases/latest';

  // Get download info for a platform (only Windows is active, others are disabled)
  const getDownloadInfo = (plat: Platform) => {
    if (plat !== 'windows') {
      return { url: '#', isDirect: false, disabled: true };
    }
    if (!release) {
      return { url: githubFallbackUrl, isDirect: false, disabled: false };
    }

    const asset = findAssetForPlatform(release.assets, plat);
    if (asset) {
      return { url: asset.browser_download_url, isDirect: true, disabled: false };
    }

    return { url: githubFallbackUrl, isDirect: false, disabled: false };
  };

  // Determine main button behavior
  const getMainButtonConfig = () => {
    if (loading) {
      return {
        text: dict.checking,
        url: '#',
        isDirect: false,
        disabled: true,
        icon: 'Laptop' as keyof typeof IconMap
      };
    }

    if (!release) {
      return {
        text: dict.fallback,
        url: githubFallbackUrl,
        isDirect: false,
        disabled: false,
        icon: 'Laptop' as keyof typeof IconMap
      };
    }

    if (platform === 'unknown') {
      return {
        text: dict.allPlatforms,
        url: '#',
        isDirect: false,
        disabled: false,
        icon: 'Laptop' as keyof typeof IconMap,
        isToggle: true
      };
    }

    if (platform !== 'windows') {
      return {
        text: getPlatformText(platform),
        url: '#',
        isDirect: false,
        disabled: true,
        icon: getPlatformIcon(platform) as keyof typeof IconMap
      };
    }

    const info = getDownloadInfo(platform);
    return {
      text: getPlatformText(platform, release.tag_name),
      url: info.url,
      isDirect: info.isDirect,
      disabled: info.disabled,
      icon: getPlatformIcon(platform) as keyof typeof IconMap
    };
  };

  const mainBtn = getMainButtonConfig();
  const MainIcon = IconMap[mainBtn.icon] || Laptop;

  // List of all platforms for dropdown
  const platformsList = [
    { id: 'windows', name: 'Windows', icon: 'Monitor', ...getDownloadInfo('windows') },
    { id: 'mac', name: isTr ? 'Mac OS (Çok Yakında)' : 'macOS (Coming Soon)', icon: 'Apple', ...getDownloadInfo('mac') },
    { id: 'linux', name: isTr ? 'Linux (Çok Yakında)' : 'Linux (Coming Soon)', icon: 'Terminal', ...getDownloadInfo('linux') },
    { id: 'android', name: isTr ? 'Android (Çok Yakında)' : 'Android (Coming Soon)', icon: 'Smartphone', ...getDownloadInfo('android') },
    { id: 'ios', name: isTr ? 'iOS (Çok Yakında)' : 'iOS (Coming Soon)', icon: 'Smartphone', ...getDownloadInfo('ios') }
  ];

  const handleMainClick = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    if (mainBtn.disabled) {
      e.preventDefault();
      return;
    }
    if ('isToggle' in mainBtn && mainBtn.isToggle) {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="lp-download-btn-container" ref={dropdownRef}>
      {mainBtn.disabled ? (
        <button 
          className={`lp-download-btn-main ${loading ? 'loading' : 'disabled'}`}
          disabled
        >
          {loading ? (
            <Loader2 className="lp-spinner" size={18} />
          ) : (
            <MainIcon size={18} />
          )}
          <span>{mainBtn.text}</span>
        </button>
      ) : (
        <a
          href={mainBtn.url}
          download={mainBtn.isDirect}
          target={mainBtn.isDirect ? undefined : '_blank'}
          rel="noopener noreferrer"
          className="lp-download-btn-main"
          onClick={handleMainClick}
        >
          <MainIcon size={18} />
          <span>{mainBtn.text}</span>
        </a>
      )}

      <button
        className={`lp-download-btn-arrow ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Other platforms"
        disabled={loading}
      >
        <ChevronDown size={16} />
      </button>

      {isOpen && (
        <div className="lp-download-dropdown">
          {platformsList.map((item) => {
            const ItemIcon = IconMap[item.icon as keyof typeof IconMap] || Laptop;
            
            if (item.disabled) {
              return (
                <div key={item.id} className="lp-download-dropdown-item disabled">
                  <ItemIcon size={16} />
                  <div className="lp-download-dropdown-item-info">
                    <span className="lp-download-dropdown-item-name">{item.name}</span>
                    <span className="lp-download-dropdown-item-sub">{dict.comingSoon}</span>
                  </div>
                </div>
              );
            }

            return (
              <a
                key={item.id}
                href={item.url}
                download={item.isDirect}
                target={item.isDirect ? undefined : '_blank'}
                rel="noopener noreferrer"
                className="lp-download-dropdown-item"
                onClick={() => setIsOpen(false)}
              >
                <ItemIcon size={16} />
                <div className="lp-download-dropdown-item-info">
                  <span className="lp-download-dropdown-item-name">{item.name}</span>
                  {release && item.id === 'windows' && item.url !== githubFallbackUrl && (
                    <span className="lp-download-dropdown-item-sub">{release.tag_name.startsWith('v') ? '' : 'v'}{release.tag_name}</span>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
