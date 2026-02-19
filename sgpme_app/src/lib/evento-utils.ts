/**
 * Utilidades para manejar eventos
 */

/**
 * Formatea el campo marca que puede ser string o array de strings
 * @param marca - String simple o array de marcas
 * @returns String formateado para mostrar
 */
export function formatearMarca(marca: string | string[]): string {
  if (!marca) return "";

  if (Array.isArray(marca)) {
    return marca.join(", ");
  }

  return marca;
}

/**
 * Verifica si un evento pertenece a una marca específica
 * @param eventoMarca - Marca(s) del evento
 * @param marcaBuscada - Marca a buscar
 * @returns true si el evento pertenece a la marca
 */
export function eventoPerteneceAMarca(
  eventoMarca: string | string[],
  marcaBuscada: string,
): boolean {
  if (!eventoMarca || !marcaBuscada) return false;

  if (Array.isArray(eventoMarca)) {
    return eventoMarca.includes(marcaBuscada);
  }

  return eventoMarca === marcaBuscada;
}

/**
 * Obtiene un array de marcas desde el campo marca
 * @param marca - String simple o array de marcas
 * @returns Array de marcas
 */
export function obtenerArrayMarcas(marca: string | string[]): string[] {
  if (!marca) return [];

  if (Array.isArray(marca)) {
    return marca;
  }

  return [marca];
}
