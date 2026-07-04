import { getDb } from "./db";

export function getSetting(key: string): string | null {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .run(key, value);
}

export interface AppWindow {
  startRaw: string;
  endRaw: string;
  start: Date;
  end: Date;
}

export function getApplicationWindow(): AppWindow {
  const startRaw = getSetting("application_start_at") || "2026-07-06T00:00:00+09:00";
  const endRaw = getSetting("application_end_at") || "2026-07-17T23:59:59+09:00";
  return { startRaw, endRaw, start: new Date(startRaw), end: new Date(endRaw) };
}

/** 서버 시각 기준 접수 가능 여부. 반드시 서버에서만 판단한다. */
export function getApplicationStatus(now: Date = new Date()): {
  open: boolean;
  phase: "before" | "open" | "closed";
  window: AppWindow;
} {
  const window = getApplicationWindow();
  let phase: "before" | "open" | "closed";
  if (now < window.start) phase = "before";
  else if (now > window.end) phase = "closed";
  else phase = "open";
  return { open: phase === "open", phase, window };
}
