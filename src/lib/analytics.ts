// Anonymous events only. Swap the body for Plausible/Vercel Analytics later; no PII is ever passed.
type EventName = "calculator_started" | "calculation_completed" | "marketplace_selected" | "calculation_mode_selected" | "scenario_viewed";
export function track(name: EventName, props?: Record<string, string | number>) {
  if (typeof window === "undefined") return;
  (window as unknown as { plausible?: (n: string, o?: unknown) => void }).plausible?.(name, { props });
}
