# Plan de Implementación: Generador de Informes SEO (Integración GSC)

Este plan detalla los pasos para integrar el "Generador de Informes SEO" en Nous, reemplazando la carga de CSV por una conexión directa a la API de Google Search Console (GSC) y solucionando los problemas de autenticación actuales.

## Fase 1: Reparar Autenticación GSC (Prioridad Alta)

El botón "Conectar GSC" en la configuración no funciona porque carece de lógica. Implementaremos un flujo OAuth 2.0 robusto.

### 1.1 Crear Endpoints de Autenticación
- **Crear `/src/app/api/auth/gsc/login/route.ts`**:
  - Endpoint GET que genera la URL de autorización de Google.
  - Scopes necesarios: `https://www.googleapis.com/auth/webmasters.readonly`.
  - Redirige al usuario a la pantalla de consentimiento de Google.

- **Crear `/src/app/api/auth/gsc/callback/route.ts`**:
  - Endpoint GET que recibe el `code` de Google.
  - Intercambia el código por `access_token` y `refresh_token`.
  - **Acción Crítica**: Guardar tokens en la tabla `user_profiles` (o `projects` vinculado al proyecto activo) usando Supabase.
  - Manejar errores y redirigir de vuelta a `/settings`.

### 1.2 Actualizar UI de Configuración
- Modificar `src/app/settings/page.tsx`:
  - Vincular el botón "Conectar GSC" al endpoint `/api/auth/gsc/login`.
  - Mostrar estado de conexión real basado en la base de datos.
  - Manejar parámetros de URL para mostrar notificaciones de éxito/error tras el callback.

## Fase 2: Módulo "Generador de Informes"

Crearemos una nueva sección en la aplicación dedicada a esta herramienta.

### 2.1 Estructura de Rutas y Componentes
- Crear ruta: `src/app/herramientas/generador-informes/page.tsx`.
- Estructura de carpetas:
  ```
  src/
    app/
      herramientas/
        generador-informes/
          page.tsx             # Interfaz principal (Selector de fechas/proyecto + Generación)
          layout.tsx           # Layout (opcional)
    components/
      report-generator/
        ReportView.tsx         # Visualización del informe HTML (Anatómico del original)
        LiveConsole.tsx        # Consola de progreso
        MetricCard.tsx         # Componentes de dashboard
    lib/
      services/
        report/
          analysisService.ts   # Lógica estadística (Migrada de la app original)
          geminiService.ts     # Generación de texto con IA (Migrada)
          gscService.ts        # NUEVO: Reemplaza csvService.ts
  ```

### 2.2 Implementación de Servicios
- **`gscService.ts` (Crucial)**:
  - Implementar la lógica de extracción de datos solicitada por el usuario:
    1.  **Fetch 1 (URLs)**: Dimension `page` (para métricas precisas de URL).
    2.  **Fetch 2 (Keywords)**: Dimension `query` (para métricas precisas de Keywords).
    3.  **Fetch 3 (Full)**: Dimensions `page` + `query` (para relaciones).
  - Normalizar datos para que coincidan con la interfaz `CSVRow` que espera el `analysisService`.
  - Manejar paginación y límites de la API de GSC.

- **`analysisService.ts`**:
  - Portar la lógica de cálculo de KPIs, detección de anomalías (ghost keywords, canibalización, etc.) desde el archivo original.
  - Adaptar tipos si es necesario para TypeScript estricto.

- **`geminiService.ts`**:
  - Configurar cliente de Google Generative AI.
  - Mantener los prompts del sistema (Dispatcher y Writer) que ya funcionan bien.

### 2.3 Interfaz de Usuario (UI/UX)
- Diseñar `page.tsx` con el estilo "Nous" (Tailwind, Glassmorphism).
- **Selectores**:
  - Proyecto (ya conectado a GSC).
  - Rango de fechas (Comparativa P1 vs P2 automática o manual).
  - Contexto adicional (TextArea para instrucciones al prompt).
- **Visualización**:
  - Renderizar el HTML generado por Gemini de forma segura (`dangerouslySetInnerHTML` sanitizado).
  - Integrar gráficos de `Chart.js` o `Recharts` (preferiblemente Chart.js para mantener compatibilidad con lógica original).

## Fase 3: Integración y Validación

- **Flujo Completo**:
  1. Usuario va a Settings -> Conecta GSC.
  2. Va a Herramientas -> Generador de Informes.
  3. Selecciona Proyecto y Fechas.
  4. Sistema extrae datos de GSC (sin CSVs).
  5. Sistema analiza y genera informe con IA.
- **Validación de Datos**: Comparar métricas del reporte con GSC nativo para asegurar que la estrategia de extracción separada funciona correctamente.

---

## Ejecución Inmediata
1. Implementar endpoints de Auth GSC.
2. Actualizar Settings Page.
3. Crear estructura del Generador de Informes.
