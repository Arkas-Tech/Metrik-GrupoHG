/**
 * Utilidad para comprimir imágenes automáticamente
 * Límite recomendado: 500KB por imagen para evitar saturar la plataforma
 */

export const MAX_FILE_SIZE = 500 * 1024;
export const MAX_WIDTH = 1920;
export const MAX_HEIGHT = 1080;
export const COMPRESSION_QUALITY = 0.85;

export interface CompressedImageResult {
  file: File;
  url: string;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
}

/**
 * Comprime una imagen si excede el tamaño máximo permitido
 * @param file - Archivo de imagen a comprimir
 * @returns Promesa con el resultado de la compresión
 */
export async function compressImage(
  file: File
): Promise<CompressedImageResult> {
  const originalSize = file.size;

  if (originalSize <= MAX_FILE_SIZE) {
    return {
      file,
      url: URL.createObjectURL(file),
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = (height * MAX_WIDTH) / width;
          width = MAX_WIDTH;
        }

        if (height > MAX_HEIGHT) {
          width = (width * MAX_HEIGHT) / height;
          height = MAX_HEIGHT;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo obtener el contexto del canvas"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Error al comprimir la imagen"));
              return;
            }

            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, ".jpg"),
              {
                type: "image/jpeg",
                lastModified: Date.now(),
              }
            );

            resolve({
              file: compressedFile,
              url: URL.createObjectURL(compressedFile),
              originalSize,
              compressedSize: compressedFile.size,
              wasCompressed: true,
            });
          },
          "image/jpeg",
          COMPRESSION_QUALITY
        );
      };

      img.onerror = () => {
        reject(new Error("Error al cargar la imagen"));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Error al leer el archivo"));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Comprime múltiples imágenes
 * @param files - Array de archivos a comprimir
 * @returns Promesa con array de resultados
 */
export async function compressMultipleImages(
  files: File[]
): Promise<CompressedImageResult[]> {
  const promises = files.map((file) => compressImage(file));
  return Promise.all(promises);
}

/**
 * Formatea el tamaño de archivo para mostrar
 * @param bytes - Tamaño en bytes
 * @returns String formateado (ej: "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
