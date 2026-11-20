"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DeviceType = "mobile" | "tablet" | "desktop";

export type DeviceInfo = {
  /** The detected class of device. */
  device: DeviceType;
  /** Current viewport width in pixels (0 until mounted). */
  width: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** True when the primary input is touch (phone/tablet). */
  isTouch: boolean;
  /** portrait | landscape */
  orientation: "portrait" | "landscape";
};

const DeviceContext = createContext<DeviceInfo>({
  device: "desktop",
  width: 0,
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isTouch: false,
  orientation: "landscape",
});

/**
 * Detect the device class from viewport width, user agent and pointer type.
 * Width is the primary signal; UA/coarse pointer keep a phone in landscape
 * (or an iPad reporting a desktop UA) from being misclassified.
 */
function detectDevice(width: number, ua: string, coarsePointer: boolean): DeviceType {
  const phoneUA = /Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua);
  const tabletUA =
    /iPad|Tablet|PlayBook|Silk/i.test(ua) ||
    (/Android/i.test(ua) && !/Mobi/i.test(ua));

  if (phoneUA && width < 1024) return "mobile";
  if (tabletUA && width >= 600) return "tablet";
  if (coarsePointer && width >= 768 && width < 1200) return "tablet";
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function DeviceProvider({ children }: { children: ReactNode }) {
  // Start with a desktop-safe default so SSR output never depends on the
  // browser, then correct it immediately after mount.
  const [info, setInfo] = useState<DeviceInfo>({
    device: "desktop",
    width: 0,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouch: false,
    orientation: "landscape",
  });

  useEffect(() => {
    const sync = () => {
      const width = window.innerWidth;
      const ua = navigator.userAgent;
      const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
      const device = detectDevice(width, ua, coarsePointer);
      const orientation =
        window.innerHeight > width ? "portrait" : "landscape";

      const next: DeviceInfo = {
        device,
        width,
        isMobile: device === "mobile",
        isTablet: device === "tablet",
        isDesktop: device === "desktop",
        isTouch: coarsePointer,
        orientation,
      };

      setInfo((previous) =>
        previous.device === next.device &&
        previous.width === next.width &&
        previous.orientation === next.orientation &&
        previous.isTouch === next.isTouch
          ? previous
          : next
      );

      const root = document.documentElement;
      root.setAttribute("data-device", device);
      root.setAttribute("data-orientation", orientation);
      root.classList.toggle("device-mobile", device === "mobile");
      root.classList.toggle("device-tablet", device === "tablet");
      root.classList.toggle("device-desktop", device === "desktop");
    };

    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  const value = useMemo(() => info, [info]);
  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

export function useDevice() {
  return useContext(DeviceContext);
}
