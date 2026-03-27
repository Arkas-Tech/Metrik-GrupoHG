"use client";

import { useEffect, useState, useCallback } from "react";
import { _registerToastListener, ToastType } from "@/lib/toast";

interface ToastState {
  msg: string;
  type: ToastType;
  id: number;
}

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

const COLORS: Record<ToastType, string> = {
  success: "bg-green-600",
  error: "bg-red-600",
  info: "bg-blue-600",
};

export default function ToastNotification() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = { current: null as ReturnType<typeof setTimeout> | null };

  const dismiss = useCallback(() => {
    setToast(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    _registerToastListener((msg, type) => {
      // Replace existing toast immediately
      setToast({ msg, type, id: Date.now() });
    });
    return () => _registerToastListener(null);
  }, []);

  useEffect(() => {
    if (!toast) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast?.id]);

  if (!toast) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium min-w-[240px] max-w-sm animate-slide-up ${COLORS[toast.type]}`}
      role="alert"
    >
      <span className="text-base font-bold">{ICONS[toast.type]}</span>
      <span className="flex-1">{toast.msg}</span>
      <button
        onClick={dismiss}
        className="shrink-0 ml-1 opacity-80 hover:opacity-100 text-lg leading-none"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  );
}
