"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string;
  imageName: string;
  imageDescription?: string;
  onClose: () => void;
}

export default function ImageModal({
  isOpen,
  imageUrl,
  imageName,
  imageDescription,
  onClose,
}: ImageModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-7xl max-h-[90vh] w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 bg-white hover:bg-gray-100 text-gray-800 rounded-full p-2 transition-colors z-10"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        {/* Imagen */}
        <div className="relative w-full h-full flex flex-col items-center bg-white rounded-lg overflow-hidden shadow-2xl">
          <div className="relative w-full flex-1 min-h-[60vh] max-h-[70vh] bg-gray-100">
            <Image
              src={imageUrl}
              alt={imageName}
              fill
              className="object-contain"
              sizes="90vw"
              priority
            />
          </div>

          {/* Info */}
          <div className="w-full bg-white p-4 border-t">
            <h3 className="font-semibold text-gray-900 text-lg mb-1">
              {imageName}
            </h3>
            {imageDescription && (
              <p className="text-gray-600 text-sm">{imageDescription}</p>
            )}
          </div>
        </div>

        {/* Instrucción */}
        <p className="text-white text-sm text-center mt-4">
          Presiona ESC o haz clic fuera para cerrar
        </p>
      </div>
    </div>
  );
}
