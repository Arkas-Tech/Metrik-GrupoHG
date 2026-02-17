"use client";

import { useEffect, useState } from "react";

interface UpdateNotificationProps {
  show: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

/**
 * Toast elegante que notifica al usuario sobre actualizaciones disponibles
 */
export default function UpdateNotification({
  show,
  onUpdate,
  onDismiss,
}: UpdateNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      // Pequeño delay para la animación
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      // Usar setTimeout para evitar setState síncrono en el efecto
      const timer = setTimeout(() => setIsVisible(false), 0);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 max-w-md">
        <div className="flex items-start gap-3">
          {/* Icono */}
          <div className="shrink-0">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              ¡Nueva versión disponible!
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Actualiza para obtener las últimas mejoras y correcciones.
            </p>

            {/* Botones */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={onUpdate}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                🔄 Actualizar ahora
              </button>
              <button
                onClick={onDismiss}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                Más tarde
              </button>
            </div>
          </div>

          {/* Botón cerrar */}
          <button
            onClick={onDismiss}
            className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
