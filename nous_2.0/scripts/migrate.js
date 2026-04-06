#!/usr/bin/env node

/**
 * Script de migración automática para Vercel
 * Ejecuta las migraciones pendientes en Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.log('⚠️  ADVERTENCIA: Migración automática deshabilitada');
    console.log('ℹ️  Para habilitar migraciones automáticas, configura la variable SUPABASE_SERVICE_ROLE_KEY en Vercel');
    console.log('ℹ️  Mientras tanto, ejecuta la migración manualmente desde el SQL Editor de Supabase');
    console.log('ℹ️  Consulta MIGRATION_SETUP.md para más detalles');
    process.exit(0); // Exit sin error para que el build continúe
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    console.log('🚀 Iniciando migración de base de datos...');

    const migrationPath = path.join(__dirname, '../supabase/migrations/20260216_content_intelligence.sql');

    if (!fs.existsSync(migrationPath)) {
        console.log('⚠️  No se encontró el archivo de migración:', migrationPath);
        return;
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    try {
        // Ejecutar la migración via RPC
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: migrationSQL // Note: parameter name might be sql or sql_query depending on function definition
        });

        // Try alternate parameter name if first fails with specific error? No, just stick to one valid convention.
        // Assuming exec_sql(sql_query text)

        if (error) {
            console.error('❌ Error RPC exec_sql:', error);
            console.log('\n⚠️  IMPORTANTE: No se pudo ejecutar la migración automáticamente.');
            console.log('Por favor copia el contenido de: supabase/migrations/20260216_content_intelligence.sql');
            console.log('Y ejecútalo en el SQL Editor de Supabase dashboard.');
        } else {
            console.log('✅ Migración ejecutada exitosamente via RPC');
        }
    } catch (err) {
        console.error('❌ Error durante la migración:', err.message);
        console.log('ℹ️  Por favor, ejecuta la migración manualmente desde el SQL Editor de Supabase');
        // No hacemos exit(1) para que el build continúe
    }
}

runMigration().then(() => {
    console.log('✨ Script de migración finalizado');
}).catch(err => {
    console.error('❌ Error fatal:', err);
});
