# Configuración de Variables de Entorno para Vercel

Para que las migraciones automáticas funcionen en Vercel, necesitas configurar la siguiente variable de entorno adicional:

## Variables Requeridas

### SUPABASE_SERVICE_ROLE_KEY

Esta es la clave de servicio con permisos administrativos de Supabase.

**Cómo obtenerla:**

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **Settings** (Configuración) → **API**
3. En la sección **Project API keys**, copia la clave **`service_role`** (⚠️ NO la `anon` key)
4. Esta clave tiene el formato: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Cómo configurarla en Vercel:**

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Navega a **Settings** → **Environment Variables**
3. Agrega una nueva variable:
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: (pega la clave que copiaste)
   - **Environment**: Marca todas (Production, Preview, Development)
4. Haz clic en **Save**

## Variables Existentes (verificar que estén configuradas)

- `NEXT_PUBLIC_SUPABASE_URL`: URL de tu proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave anónima pública

## ⚠️ Importante

- **NUNCA** compartas la `service_role` key públicamente
- **NUNCA** la uses en código del cliente (solo en scripts de servidor)
- Esta clave bypasea las políticas RLS (Row Level Security)

## Proceso de Migración Automática

Una vez configurada la variable de entorno:

1. Cada vez que hagas `git push`, Vercel ejecutará el build
2. Después del build, se ejecutará automáticamente `npm run postbuild`
3. Este script ejecutará las migraciones pendientes en Supabase
4. Verás los logs en la consola de deployment de Vercel

## Ejecutar Migración Manualmente (Opcional)

Si necesitas ejecutar la migración localmente:

```bash
npm run migrate
```

Asegúrate de tener las variables de entorno configuradas en tu archivo `.env.local`.
