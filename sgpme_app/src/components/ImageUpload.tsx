"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import {
  PhotoIcon,
  XMarkIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";
import { compressImage, formatFileSize } from "@/lib/imageCompression";

interface ImageUploadProps {
  onImageAdd: (imageData: {
    id: string;
    nombre: string;
    url: string;
    descripcion: string;
    file?: File;
  }) => void;
  disabled?: boolean;
}

export default function ImageUpload({
  onImageAdd,
  disabled = false,
}: ImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [nombreImagen, setNombreImagen] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    setError(null);
    setCompressionInfo(null);

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Solo se permiten archivos JPG, PNG o WebP");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(
        "La imagen es demasiado grande (máx. 5MB). Por favor selecciona una imagen más pequeña.",
      );
      return;
    }

    try {
      setUploading(true);

      const result = await compressImage(file);

      setSelectedFile(result.file);
      setPreview(result.url);
      setNombreImagen(file.name.replace(/\.[^/.]+$/, ""));

      if (result.wasCompressed) {
        setCompressionInfo(
          `✓ Imagen comprimida: ${formatFileSize(
            result.originalSize,
          )} → ${formatFileSize(result.compressedSize)}`,
        );
      } else {
        setCompressionInfo(
          `✓ Imagen lista: ${formatFileSize(result.originalSize)}`,
        );
      }
    } catch (err) {
      setError("Error al procesar la imagen. Intenta con otra imagen.");
      console.error("Error comprimiendo imagen:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;

        const imageData = {
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          nombre:
            nombreImagen.trim() || selectedFile.name.replace(/\.[^/.]+$/, ""),
          url: base64String,
          descripcion: descripcion.trim(),
          file: selectedFile,
        };

        onImageAdd(imageData);

        setSelectedFile(null);
        setPreview(null);
        setDescripcion("");
        setNombreImagen("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setUploading(false);
      };

      reader.onerror = () => {
        setError("Error al procesar la imagen");
        setUploading(false);
      };

      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error("Error uploading image:", error);
      setError("Error al subir la imagen");
      setUploading(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const fakeEvent = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(fakeEvent);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    setDescripcion("");
    setNombreImagen("");
    setError(null);
    setCompressionInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${
            selectedFile
              ? "border-green-300 bg-green-50"
              : "border-gray-300 hover:border-gray-400"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        {!selectedFile ? (
          <div className="space-y-3">
            <CloudArrowUpIcon className="h-12 w-12 mx-auto text-gray-400" />
            <div>
              <p className="text-gray-900 font-medium">
                Arrastra una imagen aquí o haz clic para seleccionar
              </p>
              <p className="text-sm text-gray-500 mt-1">
                JPG, PNG o WebP - Compresión automática si es mayor a 500KB
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <PhotoIcon className="h-8 w-8 mx-auto text-green-500" />
            <div>
              <p className="text-green-700 font-medium">
                📎 {selectedFile.name}
              </p>
              <p className="text-sm text-green-600">
                {formatFileSize(selectedFile.size)}
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
      {preview && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <Image
                  src={preview}
                  alt="Preview"
                  width={120}
                  height={80}
                  className="rounded-lg object-cover border border-gray-200"
                />
                <button
                  onClick={clearSelection}
                  disabled={uploading || disabled}
                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedFile?.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile?.size || 0)}
                  </p>
                  {compressionInfo && (
                    <p className="text-xs text-green-600 mt-1">
                      {compressionInfo}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link del Anuncio *
                  </label>
                  <input
                    type="text"
                    placeholder="https://ejemplo.com/anuncio"
                    value={nombreImagen}
                    onChange={(e) => setNombreImagen(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    disabled={uploading || disabled}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Este link será clickeable en el resumen de la campaña
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción (opcional)
                  </label>
                  <textarea
                    placeholder="Describe qué se ve en esta imagen..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    disabled={uploading || disabled}
                  />
                </div>

                <button
                  onClick={handleUpload}
                  disabled={uploading || disabled}
                  className={`
                    w-full px-4 py-2 rounded-md font-medium transition-colors
                    ${
                      uploading || disabled
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }
                  `}
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Procesando...
                    </span>
                  ) : (
                    "Agregar Imagen"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-blue-800 text-sm font-medium mb-1">
          💡 Consejos para mejores imágenes:
        </p>
        <ul className="text-blue-700 text-xs space-y-1">
          <li>
            • Comprime las imágenes antes de subirlas (usa herramientas online
            gratuitas)
          </li>
          <li>
            • Usa formatos JPG para fotos, PNG para imágenes con transparencia
          </li>
          <li>• Asegúrate de que las imágenes sean relevantes al evento</li>
          <li>• Escribe descripciones claras y descriptivas</li>
        </ul>
      </div>
    </div>
  );
}
