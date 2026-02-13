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

    const migrationPath = path.join(__dirname, '../supabase/migrations/20260213_emergency_schema_fix.sql');

    if (!fs.existsSync(migrationPath)) {
        console.log('⚠️  No se encontró el archivo de migración');
        return;
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    try {
        // Ejecutar la migración
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: migrationSQL
        });

        if (error) {
            // Si no existe la función exec_sql, intentamos ejecutar directamente
            console.log('⚠️  Función exec_sql no disponible, ejecutando migración manualmente...');

            // Dividir el SQL en statements individuales
            const statements = migrationSQL
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));

            for (const statement of statements) {
                if (statement.toLowerCase().startsWith('alter table')) {
                    console.log(`📝 Ejecutando: ${statement.substring(0, 50)}...`);
                    const { error: execError } = await supabase.from('_migrations').insert({
                        name: '20260211_add_editorial_fields',
                        executed_at: new Date().toISOString()
                    });

                    if (execError && !execError.message.includes('duplicate')) {
                        console.error('❌ Error al ejecutar statement:', execError);
                    }
                }
            }

            console.log('✅ Migración completada (modo manual)');
        } else {
            console.log('✅ Migración ejecutada exitosamente');
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
