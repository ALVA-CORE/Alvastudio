export type DetectedRecordingEnvironment = {
  deviceLabel: string;
  platform: "mobile" | "tablet" | "desktop";
  browser: string;
  micLabel: string | null;
};

function detectPlatform(userAgent: string): DetectedRecordingEnvironment["platform"] {
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(userAgent)) return "tablet";
  if (/iPhone|iPod|Android|Mobile/i.test(userAgent)) return "mobile";
  return "desktop";
}

function detectBrowser(userAgent: string) {
  if (/Edg\//i.test(userAgent)) return "Edge";
  if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) return "Chrome";
  if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) return "Safari";
  if (/Firefox/i.test(userAgent)) return "Firefox";
  return "Browser";
}

export function detectRecordingEnvironment(): DetectedRecordingEnvironment {
  const userAgent = navigator.userAgent;
  const platform = detectPlatform(userAgent);
  const browser = detectBrowser(userAgent);

  const deviceLabel =
    platform === "mobile"
      ? `Mobile (${browser})`
      : platform === "tablet"
        ? `Tablet (${browser})`
        : `Desktop / laptop (${browser})`;

  return {
    deviceLabel,
    platform,
    browser,
    micLabel: null,
  };
}

export async function detectMicrophoneLabel(): Promise<string | null> {
  if (!navigator.mediaDevices?.enumerateDevices) return null;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    const defaultMic = devices.find((device) => device.kind === "audioinput" && device.label);
    return defaultMic?.label ?? null;
  } catch {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const fallback = devices.find((device) => device.kind === "audioinput" && device.label);
    return fallback?.label ?? null;
  }
}

export function suggestRecordingDevice(
  platform: DetectedRecordingEnvironment["platform"]
): "mobile" | "desktop-builtin" | "tablet" {
  if (platform === "mobile") return "mobile";
  if (platform === "tablet") return "tablet";
  return "desktop-builtin";
}
