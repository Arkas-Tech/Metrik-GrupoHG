/**
 * Global imperative toast API.
 * Usable from any file without React context:
 *   import { showToast } from "@/lib/toast";
 *   showToast("Guardado correctamente", "success");
 */

export type ToastType = "success" | "error" | "info";

type ToastListener = (msg: string, type: ToastType) => void;

let _listener: ToastListener | null = null;

export function showToast(msg: string, type: ToastType = "success"): void {
  _listener?.(msg, type);
}

/** Internal — called by the ToastNotification component to register itself. */
export function _registerToastListener(fn: ToastListener | null): void {
  _listener = fn;
}
