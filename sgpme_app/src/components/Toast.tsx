"use client";

import { useEffect } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type,
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: "bg-green-50 border-green-500",
    error: "bg-red-50 border-red-500",
    info: "bg-blue-50 border-blue-500",
  }[type];

  const textColor = {
    success: "text-green-800",
    error: "text-red-800",
    info: "text-blue-800",
  }[type];

  const Icon = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    info: CheckCircleIcon,
  }[type];

  const iconColor = {
    success: "text-green-600",
    error: "text-red-600",
    info: "text-blue-600",
  }[type];

  return (
    <div
      className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 border-l-4 ${bgColor} rounded-lg shadow-lg max-w-md animate-slide-in`}
    >
      <Icon className={`w-6 h-6 ${iconColor} flex-shrink-0`} />
      <p className={`flex-1 ${textColor} font-medium`}>{message}</p>
      <button
        onClick={onClose}
        className={`${textColor} hover:opacity-70 transition-opacity`}
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  );
}
