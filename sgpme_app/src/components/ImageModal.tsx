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
      <div className="relative max-w-[60%] max-h-[90vh] w-full h-full flex items-center justify-center">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors z-10"
        >
          <XMarkIcon className="h-6 w-6 text-gray-700" />
        </button>

        <div className="relative w-full h-full flex flex-col items-center justify-center">
          {/* Imagen */}
          <div className="relative max-w-full max-h-[85vh]">
            <Image
              src={imageUrl}
              alt={imageName}
              width={1200}
              height={800}
              className="object-contain max-h-[85vh] w-auto"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Info */}
          <div className="mt-4 bg-white rounded-lg p-4 max-w-2xl">
            <h3 className="font-semibold text-gray-900 mb-1">{imageName}</h3>
            {imageDescription && (
              <p className="text-sm text-gray-600">{imageDescription}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
