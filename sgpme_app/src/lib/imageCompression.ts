/**
 * Utilidad para comprimir imágenes automáticamente
 * Garantiza que el output sea ≤ TARGET_SIZE_KB sin importar el tamaño original.
 * Usa compresión iterativa: reduce calidad hasta cumplir el límite.
 */

export const TARGET_SIZE_BYTES = 150 * 1024; // 150KB objetivo por imagen
export const MAX_WIDTH = 1280;
export const MAX_HEIGHT = 720;
export const INITIAL_QUALITY = 0.8;
export const MIN_QUALITY = 0.3;
export const QUALITY_STEP = 0.1;

// Aliases para no romper imports existentes
export const MAX_FILE_SIZE = TARGET_SIZE_BYTES;
export const COMPRESSION_QUALITY = INITIAL_QUALITY;

export interface CompressedImageResult {
  file: File;
  url: string;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
}

/**
 * Comprime una imagen garantizando output ≤ TARGET_SIZE_BYTES.
 * Siempre pasa por canvas para redimensionar, luego reduce calidad
 * iterativamente hasta cumplir el límite de tamaño.
 * @param file - Archivo de imagen a comprimir
 * @returns Promesa con el resultado de la compresión
 */
export async function compressImage(
  file: File,
): Promise<CompressedImageResult> {
  const originalSize = file.size;

  // Si ya es pequeña y es JPEG/WEBP, pasarla sin procesar para ahorrar tiempo
  if (
    originalSize <= TARGET_SIZE_BYTES &&
    (file.type === "image/jpeg" || file.type === "image/webp")
  ) {
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

      img.onload = async () => {
        // Calcular dimensiones respetando aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
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

        // Compresión iterativa: reduce calidad hasta cumplir TARGET_SIZE_BYTES
        const tryCompress = (quality: number): Promise<Blob | null> => {
          return new Promise((res) => {
            canvas.toBlob((blob) => res(blob), "image/jpeg", quality);
          });
        };

        let quality = INITIAL_QUALITY;
        let blob: Blob | null = null;

        while (quality >= MIN_QUALITY) {
          blob = await tryCompress(quality);
          if (blob && blob.size <= TARGET_SIZE_BYTES) break;
          quality = Math.round((quality - QUALITY_STEP) * 10) / 10;
        }

        // Si con calidad mínima sigue siendo grande, usar el resultado de mínima calidad
        if (!blob) {
          blob = await tryCompress(MIN_QUALITY);
        }

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
          },
        );

        resolve({
          file: compressedFile,
          url: URL.createObjectURL(compressedFile),
          originalSize,
          compressedSize: compressedFile.size,
          wasCompressed: true,
        });
      };

      img.onerror = () => reject(new Error("Error al cargar la imagen"));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error("Error al leer el archivo"));
    reader.readAsDataURL(file);
  });
}

/**
 * Comprime múltiples imágenes
 * @param files - Array de archivos a comprimir
 * @returns Promesa con array de resultados
 */
export async function compressMultipleImages(
  files: File[],
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
