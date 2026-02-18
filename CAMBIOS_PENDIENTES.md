# Cambios Pendientes de Deploy

## Fecha: 18 de Febrero, 2026

---

### 🎯 **NUEVO**: Línea negra de presupuesto cuando proyección lo sobrepasa

**Descripción:** Cuando la proyección es mayor que el presupuesto, la barra usa la proyección como referencia del 100% y una línea negra vertical marca la posición del presupuesto dentro de la barra (simétrico a cómo la línea azul marca la proyección cuando el presupuesto es mayor).

**Cambios implementados:**

1. **Base del 100%:** Se usa `Math.max(proyeccion, presupuesto)` como base de la barra. Si proyección > presupuesto, la barra al 100% = proyección. Si presupuesto >= proyección, la barra al 100% = presupuesto.
2. **Línea negra de presupuesto:** Se muestra siempre que la proyección sobrepase el presupuesto (no solo cuando el gasto lo sobrepasa).
3. **Variable `proyeccionSobrepasaPresupuesto`:** Nueva flag para controlar la visualización de la línea negra de forma independiente al gasto.

**Archivos modificados:**

- `/sgpme_app/src/components/GraficaProyeccionVsGasto.tsx` - Lógica de `base100`, nueva flag `proyeccionSobrepasaPresupuesto`, condición de línea negra

---

### 🎯 **NUEVO**: Gráfica muestra gasto sin proyección/presupuesto

**Descripción:** La gráfica de Proyección vs Gasto por Categoría ahora muestra el gasto real incluso cuando no hay proyección ni presupuesto registrado. Antes, si ambos eran 0, la barra no se renderizaba.

**Cambios implementados:**

1. **Lógica de barra:** Cuando proyección y presupuesto son 0 pero hay gasto, se usa el gasto como base del 100% para que la barra se dibuje completa (en rojo).
2. **Detección de sobrepaso:** Se detecta que el gasto sobrepasa presupuesto aunque este sea 0.
3. **Línea de presupuesto:** La línea negra de presupuesto solo se muestra si presupuesto > 0 (no se dibuja en posición 0%).
4. **Texto de porcentaje:** Muestra "Gasto sin proyección" cuando hay gasto pero no hay proyección, y "Sin datos" cuando ambos son 0.

**Archivos modificados:**

- `/sgpme_app/src/components/GraficaProyeccionVsGasto.tsx` - Lógica de `base100`, `gastoSobrepasaPresupuesto`, línea de presupuesto, texto de porcentaje

---

### 🎯 **NUEVO**: Campo de Productos en Facturas

**Descripción:** Nuevo campo de texto en el formulario de facturas para describir los productos o servicios asociados. La información se muestra en los detalles de cada factura.

**Cambios implementados:**

1. **Formulario de Factura:**
   - Nuevo campo textarea "Productos" ubicado antes de "Observaciones"
   - Placeholder: "Descripción de productos o servicios..."
   - Campo opcional, se guarda y restaura al editar

2. **Detalles de Factura:**
   - Se muestra "Productos:" en los detalles si el campo tiene contenido
   - Respeta saltos de línea con `whitespace-pre-wrap`
   - Ubicado antes de "Observaciones" en la vista de detalles

**Archivos modificados:**

**Frontend:**

- `/sgpme_app/src/types/index.ts` - Campo `productos?: string` en interfaz `Factura`
- `/sgpme_app/src/components/FormularioFactura.tsx` - Estado, textarea, reset y sync con `facturaInicial`
- `/sgpme_app/src/components/ListaFacturas.tsx` - Visualización en detalles de factura
- `/sgpme_app/src/hooks/useFacturasAPI.ts` - Mapeo en interfaz backend, response mapper y request mapper

**Backend:**

- `/HGApp/models.py` - `productos = Column(Text, nullable=True)` en modelo `Facturas`
- `/HGApp/routers/facturas.py` - Campo en `FacturaRequest`, `FacturaResponse`, create, update y response builders

**Migración:**

- `/HGApp/migrations/add_productos_facturas.py` - `ALTER TABLE facturas ADD COLUMN productos TEXT`
- Migración ejecutada exitosamente en SQLite local
- **Pendiente ejecutar en servidor de producción (PostgreSQL)**

---

### 🎯 **NUEVO**: Soporte Completo para Decimales en Montos de Facturas

**Descripción:** Mejora en el manejo de cantidades con decimales en todo el sistema, permitiendo ingresar y visualizar correctamente montos con centavos (ej: 9.90, 1234.56).

**Cambios implementados:**

1. **Entrada de Datos Mejorada:**
   - Campos de Subtotal e IVA aceptan punto decimal sin restricciones
   - Validación mejorada: permite escribir desde el primer dígito incluyendo punto (ej: `.5`, `9.9`, `1234.56`)
   - Eliminado el formateo automático con comas durante la edición que causaba confusión
   - Campo de Total calculado automáticamente con exactamente 2 decimales (control estricto)
   - Total usa `type="text"` para garantizar formato preciso sin comportamientos inesperados de inputs numéricos

2. **Visualización Consistente de Decimales:**
   - Todos los montos en el sistema ahora muestran siempre 2 decimales
   - Formato consistente: `$1,234.56` (con separador de miles y 2 decimales)
   - Aplicado en: listas de facturas, dashboard, proyecciones, gráficas, calendarios

**Archivos modificados:**

**Frontend:**

- `/sgpme_app/src/components/FormularioFactura.tsx`:
  - Campos de Subtotal e IVA: removido formateo con `Intl.NumberFormat` durante edición
  - Validación actualizada: `/^\d*\.?\d{0,2}$/` (permite 0 o más dígitos antes del punto)
  - Valor mostrado directamente sin formato para permitir edición natural
  - Total calculado con `toFixed(2)` para mantener precisión

- `/sgpme_app/src/components/ListaFacturas.tsx`:
  - `formatearMonto`: `minimumFractionDigits: 2` y `maximumFractionDigits: 2`
  - Todos los montos (subtotal, IVA, total) se muestran con 2 decimales consistentemente

- `/sgpme_app/src/components/DashboardGeneral.tsx`:
  - `formatearMoneda`: actualizado de `0` decimales a `2` decimales
  - Métricas de gasto, proyección y presupuesto respetan centavos

- `/sgpme_app/src/components/FormularioProyeccion.tsx`:
  - `formatearMonto`: actualizado para mostrar 2 decimales en proyecciones

- `/sgpme_app/src/components/ListaProyecciones.tsx`:
  - Dos funciones `formatearMonto` actualizadas (PDF y UI)
  - Presupuestos y montos proyectados con 2 decimales

**Detalles técnicos:**

### 1. Validación Mejorada en Inputs

```typescript
onChange={(e) => {
  const valor = e.target.value;
  // Permite: "", "9", "9.", "9.9", "9.90", ".5" (se convierte a "0.5")
  if (valor === "" || /^\d*\.?\d{0,2}$/.test(valor)) {
    setSubtotal(valor);
  }
}}
```

**Cambios clave:**

- `\d*` en lugar de `\d+`: permite empezar con punto decimal
- Sin formateo durante edición: el usuario ve exactamente lo que escribe
- Validación en tiempo real: solo acepta números válidos con hasta 2 decimales

### 2. Cálculo Automático del Total

```typescript
useEffect(() => {
  const subtotalNum = parseFloat(subtotal) || 0;
  const ivaNum = parseFloat(iva) || 0;
  const totalCalculado = subtotalNum + ivaNum;
  setTotal(totalCalculado.toFixed(2)); // Siempre 2 decimales
}, [subtotal, iva]);

// Campo de visualización del Total
<input
  type="text"
  value={total ? parseFloat(total).toFixed(2) : "0.00"}
  disabled
  readOnly
/>
```

**Características:**

- Cálculo automático al cambiar subtotal o IVA
- `toFixed(2)` en el cálculo asegura precisión de 2 decimales
- Campo de Total usa `type="text"` para control exacto del formato
- Doble verificación: `parseFloat(total).toFixed(2)` en la visualización
- Siempre muestra exactamente 2 decimales, incluso con `.00`

### 3. Formateo Consistente en Visualización

```typescript
const formatearMonto = (monto: number) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2, // Antes: 0
    maximumFractionDigits: 2, // Agregado
  }).format(monto);
};
```

**Ventajas:**

- ✅ Usuario puede escribir decimales libremente (9.9, 0.5, 1234.56)
- ✅ Cálculos precisos al centavo con `toFixed(2)` en toda la cadena
- ✅ Total SIEMPRE muestra exactamente 2 decimales (nunca más, nunca menos)
- ✅ Visualización consistente en todo el sistema
- ✅ No se pierden centavos en cálculos de totales
- ✅ Compatible con montos que terminan en .00 (se muestran explícitamente)
- ✅ Experiencia de edición natural sin formateo que interfiera
- ✅ Campo de Total con doble validación de formato (cálculo + visualización)

---

### 🎯 **NUEVO**: Mejoras en Flujo de Creación de Facturas

**Descripción:** Optimización del flujo de trabajo para crear facturas, permitiendo agregar proveedores sin salir del formulario de factura.

**Cambios implementados:**

1. **Botón de Navegación Mejorado:**
   - Cambio de "Volver al Dashboard" a "Volver a Facturas" en formularios de nueva factura y edición
   - Mejora la claridad de navegación para el usuario

2. **Creación Inline de Proveedores:**
   - Botón "+" pequeño y discreto en la misma línea que el label "Proveedor \*"
   - Sin bordes ni fondo, solo el símbolo "+" en color azul
   - Modal popup para agregar nuevo proveedor sin salir del formulario
   - Auto-selección automática del proveedor recién creado con todos sus datos
   - Mejora significativa en la experiencia de usuario

**Archivos modificados:**

**Frontend:**

- `/sgpme_app/src/app/facturas/page.tsx`:
  - Textos de botones de navegación actualizados
  - Nuevo estado `mostrarModalProveedor` y `proveedorRecienCreado`
  - Nueva función `manejarCrearProveedorDesdeModal` con retry logic
  - Props `onAbrirModalProveedor` y `proveedorRecienCreado` pasadas a FormularioFactura
  - Modal renderizado para FormularioProveedor

- `/sgpme_app/src/components/FormularioFactura.tsx`:
  - Nuevas props opcionales: `onAbrirModalProveedor` y `proveedorRecienCreado`
  - Botón "+" posicionado junto al label usando flexbox
  - useEffect mejorado para auto-seleccionar proveedor recién creado con logs de depuración
  - UI mejorada: botón sin bordes, solo texto azul hover

- `/sgpme_app/src/hooks/useProveedoresAPI.ts`:
  - Return completo en `crearProveedor` con todos los campos (RFC, dirección separada, etc.)
  - Asegura que el objeto Proveedor retornado esté completo para auto-selección

**Detalles técnicos:**

### 1. Botón "+" Mejorado

```tsx
<div className="flex items-center justify-between mb-1">
  <label className="text-sm font-medium text-gray-700">
    Proveedor *
  </label>
  {onAbrirModalProveedor && (
    <button
      type="button"
      onClick={onAbrirModalProveedor}
      className="text-blue-600 hover:text-blue-800 font-bold focus:outline-none leading-none"
      title="Agregar nuevo proveedor"
    >
      +
    </button>
  )}
</div>
<select className="w-full ...">...</select>
```

**Características del botón:**

- Mismo tamaño de fuente que el label (text-sm) para mantener layout consistente
- `leading-none` para eliminar line-height extra y evitar desplazamiento vertical
- Sin bordes ni fondo, solo texto azul
- Posicionado a la derecha del label usando `justify-between`
- No afecta la altura del contenedor ni desplaza el selector hacia abajo

### 2. Modal de Proveedor

El modal se muestra como overlay con:

- Fondo semitransparente (bg-black bg-opacity-50)
- Tarjeta centrada con scroll interno (max-h-[90vh])
- Header sticky con título y botón de cerrar
- FormularioProveedor completo dentro del modal

### 3. Flujo de Auto-selección Mejorado

El flujo se optimizó para asegurar que el proveedor recién creado aparezca en la lista y se seleccione automáticamente:

```typescript
// useEffect en FormularioFactura.tsx con logs de depuración
useEffect(() => {
  if (proveedorRecienCreado && proveedores.length > 0) {
    console.log("🔍 Buscando proveedor recién creado:", {
      proveedorRecienCreado,
      totalProveedores: proveedores.length,
      idsProveedores: proveedores.map((p) => p.id),
    });

    const proveedorNuevo = proveedores.find(
      (p) => p.id === proveedorRecienCreado,
    );

    if (proveedorNuevo) {
      console.log("✅ Auto-seleccionando proveedor:", proveedorNuevo.nombre);
      setProveedor(proveedorNuevo.nombre);
      setRfc(proveedorNuevo.rfc || "");
    } else {
      console.warn(
        "⚠️ No se encontró el proveedor con ID:",
        proveedorRecienCreado,
      );
    }
  }
}, [proveedorRecienCreado, proveedores]);
```

### 4. Handler de Creación con Timing Mejorado

```typescript
const manejarCrearProveedorDesdeModal = async (datos) => {
  const nuevoProveedor = await crearProveedor(datos); // Ya llama a cargarProveedores internamente
  console.log("✅ Proveedor creado desde modal:", nuevoProveedor);

  setMostrarModalProveedor(false);
  await cargarProveedores(); // Segunda carga para asegurar

  // Delay para asegurar que React actualice el estado antes de establecer ID
  setTimeout(() => {
    if (nuevoProveedor && nuevoProveedor.id) {
      console.log(
        "🎯 Estableciendo proveedor recién creado:",
        nuevoProveedor.id,
      );
      setProveedorRecienCreado(nuevoProveedor.id);
    }
  }, 100);
};
```

### 5. Return Completo en crearProveedor

Ahora retorna todos los campos del Proveedor:

```typescript
return {
  id: proveedorCreado.id.toString(),
  nombre: proveedorCreado.nombre,
  razonSocial: proveedorCreado.razon_social || "",
  contacto: proveedorCreado.contacto,
  email: proveedorCreado.email,
  rfc: proveedorCreado.rfc, // Obligatorio
  telefono: proveedorCreado.telefono || "",
  direccion: proveedorCreado.direccion || "",
  calle: proveedorCreado.calle || "",
  numeroExterior: proveedorCreado.numero_exterior || "",
  numeroInterior: proveedorCreado.numero_interior || "",
  colonia: proveedorCreado.colonia || "",
  ciudad: proveedorCreado.ciudad || "",
  estado: proveedorCreado.estado || "",
  codigoPostal: proveedorCreado.codigo_postal || "",
  categoria: proveedorCreado.categoria,
  activo: proveedorCreado.activo,
  fechaCreacion: new Date().toISOString().split("T")[0],
};
```

**Ventajas:**

- ✅ Usuario no pierde contexto del formulario de factura
- ✅ Proveedor se selecciona automáticamente tras creación con todos los campos (RFC, dirección, etc.)
- ✅ RFC y datos se autocompletan desde el proveedor creado
- ✅ Flujo más rápido y eficiente
- ✅ Reducción de clics y navegación innecesaria
- ✅ Logs de depuración para troubleshooting
- ✅ Timing mejorado para asegurar sincronización de estado
- ✅ Diseño limpio y minimalista del botón "+"

**Correcciones implementadas:**

- 🔧 Return completo de `crearProveedor` con todos los campos del proveedor
- 🔧 Delay de 100ms para asegurar que React actualice el estado antes de auto-seleccionar
- 🔧 Doble llamada a `cargarProveedores` para asegurar que la lista esté actualizada
- 🔧 Logs extensivos para depuración del flujo de auto-selección
- 🔧 Botón "+" con `leading-none` para evitar desplazamiento vertical del layout
- 🔧 Tamaño de fuente consistente con el label para mantener altura uniforme

---

### 🎯 **NUEVO**: Campos de Dirección Separados y RFC Obligatorio en Proveedores

**Descripción:** Refactorización del formulario de registro de proveedores para mejorar la captura y estructuración de datos de dirección, y hacer obligatorio el campo RFC.

**Cambios implementados:**

1. **Dirección Separada en Múltiples Campos:**
   - Calle
   - Número Exterior
   - Número Interior
   - Colonia
   - Ciudad
   - Estado
   - Código Postal

2. **RFC Obligatorio:**
   - Cambiado de opcional a requerido
   - Validación de longitud (12-13 caracteres)
   - Campo con validación visual de errores

**Archivos modificados:**

**Backend:**

- `/backend/migrations/separar_direccion_proveedores.py` - Nueva migración
- `/HGApp/migrations/separar_direccion_proveedores.py` - Nueva migración
- `/HGApp/models.py` - Modelo Proveedores actualizado
- `/HGApp/routers/proveedores.py` - Esquemas Pydantic actualizados

**Frontend:**

- `/sgpme_app/src/types/index.ts` - Interfaz Proveedor
- `/sgpme_app/src/components/FormularioProveedor.tsx` - UI del formulario
- `/sgpme_app/src/hooks/useProveedoresAPI.ts` - Transformaciones de datos

**Detalles técnicos:**

### 1. Migración de Base de Datos

```python
# Nuevos campos agregados a tabla proveedores
'calle': 'TEXT',
'numero_exterior': 'VARCHAR(20)',
'numero_interior': 'VARCHAR(20)',
'colonia': 'VARCHAR(200)',
'ciudad': 'VARCHAR(200)',
'estado': 'VARCHAR(100)',
'codigo_postal': 'VARCHAR(10)'

# RFC ahora NOT NULL
rfc = Column(String, unique=True, nullable=False)
```

### 2. Modelo Backend (models.py)

```python
class Proveedores(Base):
    __tablename__ = 'proveedores'

    # ... campos existentes ...
    rfc = Column(String, unique=True, nullable=False)  # Ahora obligatorio

    # Campo antiguo mantenido por compatibilidad
    direccion = Column(Text, nullable=True)

    # Nuevos campos de dirección separados
    calle = Column(Text, nullable=True)
    numero_exterior = Column(String(20), nullable=True)
    numero_interior = Column(String(20), nullable=True)
    colonia = Column(String(200), nullable=True)
    ciudad = Column(String(200), nullable=True)
    estado = Column(String(100), nullable=True)
    codigo_postal = Column(String(10), nullable=True)
```

### 3. Interfaz TypeScript (types/index.ts)

```typescript
export interface Proveedor {
  id: string;
  nombre: string;
  razonSocial?: string;
  contacto: string;
  email: string;
  rfc: string; // Ahora obligatorio
  telefono?: string;

  // Campo antiguo (compatibilidad)
  direccion?: string;

  // Nuevos campos de dirección
  calle?: string;
  numeroExterior?: string;
  numeroInterior?: string;
  colonia?: string;
  ciudad?: string;
  estado?: string;
  codigoPostal?: string;

  categoria: string;
  activo: boolean;
  fechaCreacion: string;
  creadoPor?: string;
}
```

### 4. Formulario (FormularioProveedor.tsx)

**Campo RFC - Ahora obligatorio:**

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">RFC *</label>
  <input
    type="text"
    value={datos.rfc}
    onChange={handleChange("rfc")}
    className={`... ${errores.rfc ? "border-red-500" : "border-gray-300"}`}
    placeholder="ABC123456XYZ"
    maxLength={13}
  />
  {errores.rfc && <p className="text-red-500 text-sm mt-1">{errores.rfc}</p>}
</div>
```

**Validación actualizada:**

```tsx
if (!datos.rfc.trim()) {
  nuevosErrores.rfc = "El RFC es requerido";
} else if (datos.rfc.length < 12 || datos.rfc.length > 13) {
  nuevosErrores.rfc = "El RFC debe tener entre 12 y 13 caracteres";
}
```

**Nueva sección de dirección:**

```tsx
{/* Sección de Dirección */}
<div className="col-span-2">
  <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2">
    Dirección
  </h4>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-2">
  {/* Calle */}
  <div>
    <label>Calle</label>
    <input type="text" value={datos.calle} ... />
  </div>

  {/* Números Exterior e Interior */}
  <div className="grid grid-cols-2 gap-2">
    <div>
      <label>Número Ext.</label>
      <input type="text" value={datos.numeroExterior} ... />
    </div>
    <div>
      <label>Número Int.</label>
      <input type="text" value={datos.numeroInterior} ... />
    </div>
  </div>

  {/* Colonia, Ciudad, Estado, Código Postal */}
  ...
</div>
```

**Beneficios:**

- ✅ Datos de dirección más estructurados y completos
- ✅ Mejor UX con campos específicos en lugar de texto libre
- ✅ Validación mejorada con campo RFC obligatorio
- ✅ Facilita búsquedas y filtros por ubicación
- ✅ Preparado para integración con servicios de geolocalización
- ✅ Compatibilidad retroactiva mantenida (campo `direccion` antiguo preservado)

**Estado:** ✅ Implementado localmente, pendiente de deploy a producción

---

### 🎯 **NUEVO**: Filtros de Subcategorías en Gráfica de Proyección vs Gasto

**Descripción:** Agregar selectores de subcategorías dinámicos en la gráfica de proyección vs gasto por categoría en `/facturas`. Los usuarios pueden filtrar el gasto mostrado seleccionando/deseleccionando subcategorías específicas de cada categoría.

**Archivo:** `/sgpme_app/src/components/GraficaProyeccionVsGasto.tsx`

**Características implementadas:**

1. **Selectores Dinámicos de Subcategorías:**
   - Se muestran debajo de la barra de progreso de cada categoría
   - Ubicación: lado izquierdo, mismo tamaño que el indicador "Gasto: X% de proyección"
   - Se actualizan automáticamente desde el editor de categorías
   - Botones de "Seleccionar todas" / "Deseleccionar todas" por categoría

2. **Estado Inicial:**
   - Todas las subcategorías seleccionadas por defecto
   - Se inicializan dinámicamente según las categorías activas

3. **Filtrado en Tiempo Real:**
   - Al deseleccionar subcategorías, la gráfica se actualiza instantáneamente
   - Solo suma el gasto de facturas con subcategorías seleccionadas
   - Mantiene proyección y presupuesto sin cambios

**Cambios técnicos:**

```tsx
// 1. Interfaz actualizada con subcategoria
interface FacturaBackend {
  categoria?: string;
  subcategoria?: string;  // AGREGADO
  monto: number;
  subtotal?: number;
  estado: string;
  ...
}

// 2. Nuevo estado para subcategorías seleccionadas
const [subcategoriasSeleccionadas, setSubcategoriasSeleccionadas] = useState<
  Record<string, string[]>
>({});

// 3. Obtener subcategorías del hook
const { nombresCategorias, subcategoriasPorCategoria, loading: loadingCategorias } = useCategorias();

// 4. Recálculo dinámico con useMemo
const datosConSubcategorias = useMemo(() => {
  // Filtra facturas según subcategorías seleccionadas
  facturasOriginales.forEach((factura) => {
    const subcatsSeleccionadas = subcategoriasSeleccionadas[cat] || [];
    if (subcatsSeleccionadas.length === 0 || subcatsSeleccionadas.includes(factura.subcategoria)) {
      // Suma al gasto
    }
  });
}, [facturasOriginales, subcategoriasSeleccionadas, ...]);
```

**UI implementado:**

```tsx
<div className="mt-2 flex justify-between items-start gap-4">
  {/* Selectores de subcategorías (izquierda) */}
  <div className="flex-1">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xs font-medium text-gray-600">Subcategorías:</span>
      <button onClick={() => toggleTodasSubcategorias(categoria)}>
        {todasSeleccionadas ? "Deseleccionar todas" : "Seleccionar todas"}
      </button>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {subcategorias.map((subcat) => (
        <button
          onClick={() => toggleSubcategoria(categoria, subcat)}
          className={seleccionada ? "bg-blue-500" : "bg-gray-200"}
        >
          {subcat}
        </button>
      ))}
    </div>
  </div>

  {/* Porcentaje de gasto (derecha) */}
  <div className="text-right">
    <span>Gasto: X% de proyección</span>
  </div>
</div>
```

**Funcionalidad:**

- ✅ Todas las subcategorías seleccionadas por defecto
- ✅ Click en subcategoría → toggle selección
- ✅ "Seleccionar todas" / "Deseleccionar todas" por categoría
- ✅ Recálculo automático del gasto al cambiar selección
- ✅ Sincronización con editor de categorías (cambios reflejados automáticamente)
- ✅ No afecta proyección ni presupuesto

**Beneficios:**

- Mayor granularidad en el análisis financiero
- Permite identificar gastos específicos por subcategoría
- Interfaz intuitiva con feedback visual inmediato
- Mantiene contexto completo (proyección y presupuesto siempre visibles)

**Estado:** ✅ Implementado localmente, pendiente de deploy a producción

---

### 🎯 Cambio Global: Usar Subtotal (pre-IVA) en todas las Métricas y Gráficas

**Descripción:** Cambio sistemático en toda la aplicación para que las métricas financieras, gráficas y cálculos de gasto utilicen el **Subtotal** (monto antes de impuestos) en lugar del **Total** (monto con IVA incluido).

**Razón del cambio:**

- Los presupuestos se definen en montos antes de impuestos
- Es más preciso comparar gasto vs presupuesto usando subtotales
- El Total (con IVA) distorsiona las comparaciones presupuestarias
- Mantiene consistencia en toda la aplicación (lista de facturas ya mostraba subtotal)

---

## 📊 Cambios Implementados

### 1. Dashboard General - Métricas Principales

**Archivo:** `/sgpme_app/src/components/DashboardGeneral.tsx`

**Cambios realizados:**

#### a) Métrica "Total Gastado" (líneas ~612-614)

```tsx
// ANTES:
const totalGastado = facturasFiltradas
  .filter((f) => f.estado === "Pagada")
  .reduce((sum, f) => sum + f.total, 0);

// DESPUÉS:
const totalGastado = facturasFiltradas
  .filter((f) => f.estado === "Pagada")
  .reduce((sum, f) => sum + f.subtotal, 0);
```

#### b) Métrica "Total por Pagar" (líneas ~616-618)

```tsx
// ANTES:
const totalPorPagar = facturasFiltradas
  .filter((f) => f.estado === "Pendiente" || f.estado === "Autorizada")
  .reduce((sum, f) => sum + f.total, 0);

// DESPUÉS:
const totalPorPagar = facturasFiltradas
  .filter((f) => f.estado === "Pendiente" || f.estado === "Autorizada")
  .reduce((sum, f) => sum + f.subtotal, 0);
```

#### c) Gráfica Presupuesto vs Gasto Real (línea ~652)

```tsx
// ANTES:
datosPorMes[mes].gastoReal += factura.total;

// DESPUÉS:
datosPorMes[mes].gastoReal += factura.subtotal;
```

**Impacto:** Las tres métricas principales del dashboard ahora reflejan montos pre-IVA.

---

### 2. Eventos - Calendario Mensual

**Archivo:** `/sgpme_app/src/components/CalendarioMensual.tsx`

**Cambio realizado (línea ~238):**

```tsx
// ANTES:
gastoReal={facturas
  .filter(...)
  .reduce((sum, f) => sum + f.total, 0)}

// DESPUÉS:
gastoReal={facturas
  .filter(...)
  .reduce((sum, f) => sum + f.subtotal, 0)}
```

**Impacto:** La gráfica "Presupuesto vs Gasto" mensual ahora usa subtotales.

---

### 3. Eventos - Calendario Trimestral

**Archivo:** `/sgpme_app/src/components/CalendarioTrimestral.tsx`

**Cambio realizado (línea ~243):**

```tsx
// ANTES:
return facturasEventosPorPeriodo.reduce((sum, f) => sum + f.total, 0);

// DESPUÉS:
return facturasEventosPorPeriodo.reduce((sum, f) => sum + f.subtotal, 0);
```

**Impacto:** La gráfica "Presupuesto vs Gasto" trimestral ahora usa subtotales.

---

### 4. Eventos - Calendario Anual

**Archivo:** `/sgpme_app/src/components/CalendarioAnual.tsx`

**Cambio realizado (línea ~273):**

```tsx
// ANTES:
return facturasEventosPorPeriodo.reduce((sum, f) => sum + f.total, 0);

// DESPUÉS:
return facturasEventosPorPeriodo.reduce((sum, f) => sum + f.subtotal, 0);
```

**Impacto:** La gráfica "Presupuesto vs Gasto" anual ahora usa subtotales.

---

### 5. Facturas - Gráfica Proyección vs Gasto por Categoría

**Archivo:** `/sgpme_app/src/components/GraficaProyeccionVsGasto.tsx`

**Cambios realizados:**

#### a) Interfaz FacturaBackend (líneas ~28-31)

```tsx
// ANTES:
interface FacturaBackend {
  categoria?: string;
  monto: number;
  estado: string;
  ...
}

// DESPUÉS:
interface FacturaBackend {
  categoria?: string;
  monto: number;
  subtotal?: number;  // AGREGADO
  estado: string;
  ...
}
```

#### b) Cálculo de gasto por categoría (línea ~192)

```tsx
// ANTES:
categorias[cat].gasto += factura.monto || 0;

// DESPUÉS:
categorias[cat].gasto += factura.subtotal || 0;
```

**Nota técnica:**

- El campo `monto` en el backend corresponde al Total (con IVA)
- El campo `subtotal` en el backend corresponde al Subtotal (pre-IVA)
- Se agregó `subtotal` a la interfaz TypeScript para usar el valor correcto

**Impacto:** La gráfica de "Proyección vs Gasto" por categoría ahora muestra montos pre-IVA.

---

### 6. Facturas - Mostrar Subtotal en lista

**Archivo:** `/sgpme_app/src/components/ListaFacturas.tsx`

**Estado:** ✅ Ya implementado en cambio anterior

**Cambios:**

- Header de columna: "Total" → "Subtotal" (línea ~315)
- Valor mostrado: `factura.total` → `factura.subtotal` (línea ~372)

---

## 📋 Resumen de Cambios

| Componente                               | Archivo                      | Líneas Modificadas | Cambio                               |
| ---------------------------------------- | ---------------------------- | ------------------ | ------------------------------------ |
| Dashboard - Total Gastado                | DashboardGeneral.tsx         | ~612-614           | `f.total` → `f.subtotal`             |
| Dashboard - Total por Pagar              | DashboardGeneral.tsx         | ~616-618           | `f.total` → `f.subtotal`             |
| Dashboard - Gráfica Presupuesto vs Gasto | DashboardGeneral.tsx         | ~652               | `factura.total` → `factura.subtotal` |
| Calendario Mensual                       | CalendarioMensual.tsx        | ~238               | `f.total` → `f.subtotal`             |
| Calendario Trimestral                    | CalendarioTrimestral.tsx     | ~243               | `f.total` → `f.subtotal`             |
| Calendario Anual                         | CalendarioAnual.tsx          | ~273               | `f.total` → `f.subtotal`             |
| Gráfica Proyección - Interface           | GraficaProyeccionVsGasto.tsx | ~30                | Agregado `subtotal?: number;`        |
| Gráfica Proyección - Cálculo             | GraficaProyeccionVsGasto.tsx | ~192               | `factura.monto` → `factura.subtotal` |
| Lista Facturas                           | ListaFacturas.tsx            | ~315, ~372         | Columna Total → Subtotal             |

**Total de archivos modificados:** 5  
**Total de cambios en código:** 9

---

## 🔍 Verificación y Testing

**Áreas a verificar antes del deploy:**

1. **Dashboard:**
   - Verificar que "Total Gastado" refleje suma de subtotales de facturas pagadas
   - Verificar que "Total por Pagar" refleje suma de subtotales de facturas pendientes/autorizadas
   - Verificar que la gráfica trimestral muestre gastos reales basados en subtotales

2. **Eventos - Calendarios:**
   - Verificar calendario mensual: gráfica Presupuesto vs Gasto usa subtotales
   - Verificar calendario trimestral: gráfica Presupuesto vs Gasto usa subtotales
   - Verificar calendario anual: gráfica Presupuesto vs Gasto usa subtotales

3. **Facturas:**
   - Verificar que la lista muestre columna "Subtotal"
   - Verificar que gráfica "Proyección vs Gasto" use subtotales por categoría

**Tests recomendados:**

```bash
# 1. Crear factura de prueba con:
#    Subtotal: $1,000.00
#    IVA: $160.00
#    Total: $1,160.00

# 2. Marcar como "Pagada"

# 3. Verificar que Dashboard muestre:
#    Total Gastado: $1,000.00 (no $1,160.00)

# 4. Verificar gráficas muestren $1,000.00
```

---

## 🚀 Deploy

**Estado:** ✅ Implementado localmente, pendiente de deploy a producción

**Backend:** No requiere cambios (ya envía ambos campos: `subtotal` y `total`/`monto`)

**Frontend:** Requiere deploy de cambios en 5 componentes React

**Pasos de deploy:**

1. Commit de cambios en frontend
2. Push a repositorio
3. SSH a servidor metrik
4. Pull de cambios
5. Rebuild de frontend (`npm run build`)
6. Restart de frontend con PM2
7. Verificación de métricas en producción

---

## 📝 Notas Adicionales

- ✅ No hay cambios de base de datos necesarios
- ✅ Compatibilidad retroactiva mantenida (backend sigue enviando ambos campos)
- ✅ Modales y detalles expandidos no afectados (siguen mostrando ambos valores)
- ✅ Exportaciones y reportes mantienen sus formatos actuales
- ⚠️ Validar que presupuestos estén definidos en subtotal (pre-IVA) para comparaciones precisas

---

**Último update:** 18 de Febrero, 2026
**Implementado por:** Sistema automatizado
**Revisado por:** Pendiente
