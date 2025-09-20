import { AppConfig } from "@/types/pubky";

export const getAppConfig = (): AppConfig => {
  return {
    appName: process.env.NEXT_PUBLIC_APP_NAME || "Pubky Tools",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    appCallbackUrl: process.env.NEXT_PUBLIC_APP_CALLBACK_URL ||
      "http://localhost:3000/link",
    pubkyRelay: process.env.NEXT_PUBLIC_PUBKY_RELAY ||
      "https://httprelay.pubky.app/link",
    pubkyRingIOSUrl: process.env.NEXT_PUBLIC_PUBKY_RING_IOS_URL ||
      "https://apps.apple.com/app/pubky-ring",
    pubkyRingAndroidUrl: process.env.NEXT_PUBLIC_PUBKY_RING_ANDROID_URL ||
      "https://play.google.com/store/apps/details?id=com.pubky.ring",
  };
};

export const isMobile = (): boolean => {
  if (typeof globalThis.window === "undefined") return false;

  return globalThis.window.innerWidth <= 768 ||
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
};

export const openPubkyRingApp = (authUrl: string): void => {
  const config = getAppConfig();
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const fallbackUrl = isIOS
    ? config.pubkyRingIOSUrl
    : config.pubkyRingAndroidUrl;

  // Create deep link for Pubky Ring app with proper callback
  const callbackUrl = encodeURIComponent(config.appCallbackUrl);
  const appLink = `pubkyring://auth?url=${
    encodeURIComponent(authUrl)
  }&callback=${callbackUrl}`;

  // Try to open the app
  globalThis.window.location.href = appLink;

  // Fallback to store if app is not installed after 2 seconds
  setTimeout(() => {
    globalThis.window.open(fallbackUrl, "_blank");
  }, 2000);
};
