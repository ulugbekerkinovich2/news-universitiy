/**
 * Timezone utilities — always display in Asia/Tashkent (UTC+5)
 */

export const TZ = "Asia/Tashkent";

/** "HH:mm:ss" in Tashkent time */
export function fmtTime(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleTimeString("uz-UZ", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** "d MMM yyyy, HH:mm" in Tashkent time */
export function fmtDateTime(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleString("uz-UZ", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** "d MMMM yyyy" in Tashkent */
export function fmtDate(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleDateString("uz-UZ", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Short "d MMM yyyy" */
export function fmtDateShort(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleDateString("uz-UZ", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Relative time: "5 daqiqa oldin" etc. using Intl.RelativeTimeFormat */
export function fmtRelative(dateStr: string | Date): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat("uz", { numeric: "auto" });
  if (diffSec < 60) return rtf.format(-diffSec, "second");
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return rtf.format(-diffHr, "hour");
  const diffDay = Math.floor(diffHr / 24);
  return rtf.format(-diffDay, "day");
}
