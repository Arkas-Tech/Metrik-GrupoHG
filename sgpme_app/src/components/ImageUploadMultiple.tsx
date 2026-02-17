"use client";

import React, { useRef, useState } from "react";
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { compressImage } from "@/lib/imageCompression";

interface ImageUploadMultipleProps {
  onImagesAdd: (
    imagesData: {
      id: string;
      nombre: string;
      url: string;
      descripcion: string;
      file?: File;
    }[],
  ) => void;
  disabled?: boolean;
}

export default function ImageUploadMultiple({
  onImagesAdd,
  disabled = false,
}: ImageUploadMultipleProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingCount, setProcessingCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setUploading(true);
    const filesArray = Array.from(files);
    setTotalCount(filesArray.length);
    setProcessingCount(0);

    const processedImages: {
      id: string;
      nombre: string;
      url: string;
      descripcion: string;
      file?: File;
    }[] = [];

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      setProcessingCount(i + 1);

      // Validar tipo de archivo
      if (!ALLOWED_TYPES.includes(file.type)) {
        console.warn(`Archivo ${file.name} omitido: tipo no permitido`);
        continue;
      }

      // Validar tamaño
      if (file.size > MAX_FILE_SIZE) {
        console.warn(`Archivo ${file.name} omitido: demasiado grande`);
        continue;
      }

      try {
        // Comprimir imagen
        const result = await compressImage(file);

        // Convertir a base64
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(result.file);
        });

        // Agregar a la lista
        processedImages.push({
          id: `img_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
          nombre: file.name.replace(/\.[^/.]+$/, ""), // Usar nombre del archivo sin extensión
          url: base64String,
          descripcion: "", // Descripción vacía por defecto
          file: result.file,
        });
      } catch (err) {
        console.error(`Error procesando ${file.name}:`, err);
      }
    }

    // Agregar todas las imágenes procesadas
    if (processedImages.length > 0) {
      onImagesAdd(processedImages);
    } else {
      setError("No se pudo procesar ninguna imagen");
    }

    // Resetear
    setUploading(false);
    setProcessingCount(0);
    setTotalCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const fakeEvent = {
        target: { files: Array.from(files) },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(fakeEvent);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div className="space-y-4">
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${uploading ? "border-blue-300 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
          multiple
        />

        {uploading ? (
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div>
              <p className="text-blue-700 font-medium">
                Procesando imágenes...
              </p>
              <p className="text-sm text-blue-600 mt-1">
                {processingCount} de {totalCount}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <CloudArrowUpIcon className="h-12 w-12 mx-auto text-gray-400" />
            <div>
              <p className="text-gray-900 font-medium">
                Arrastra imágenes aquí o haz clic para seleccionar
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Selecciona una o varias imágenes - JPG, PNG o WebP
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Las imágenes se agregarán automáticamente, podrás editarlas
                después
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-blue-800 text-sm font-medium mb-1">
          💡 Agregar múltiples imágenes:
        </p>
        <ul className="text-blue-700 text-xs space-y-1">
          <li>
            • Puedes seleccionar todas las imágenes que quieras de una vez
          </li>
          <li>• Las imágenes se agregarán automáticamente</li>
          <li>• Después podrás editar el nombre y descripción de cada una</li>
          <li>• Formatos permitidos: JPG, PNG, WebP (máx. 5MB cada una)</li>
        </ul>
      </div>
    </div>
  );
}
