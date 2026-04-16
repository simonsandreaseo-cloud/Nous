const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pugbtgqfxylmovcwvmbo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1Z2J0Z3FmeHlsbW92Y3d2bWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc3NTU2MiwiZXhwIjoyMDkxMzUxNTYyfQ.WsUFcV52tSuoPb4VTO2Oqjmo2ZGXaUffdqr1JsGTJbI'; // service_role
const supabase = createClient(supabaseUrl, supabaseKey);

const OLD_EMAIL = 'alesbarillas96@gmail.com';
const NEW_EMAIL = 'alejbarillas96@gmail.com';

async function fixPermissions() {
    console.log(`🚀 Iniciando corrección para Alejandro (${OLD_EMAIL} -> ${NEW_EMAIL})...`);

    // 1. Buscar el usuario por el mail "incorrecto"
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error('❌ Error al listar usuarios:', listError);
        return;
    }

    const user = users.find(u => u.email === OLD_EMAIL);
    if (!user) {
        console.log(`⚠️ No se encontró al usuario con el email ${OLD_EMAIL}. ¿Quizás ya fue corregido?`);
        // Verificamos si el nuevo ya existe
        const userJ = users.find(u => u.email === NEW_EMAIL);
        if (userJ) {
            console.log(`✅ El usuario ya existe con el email correcto: ${NEW_EMAIL}. ID: ${userJ.id}`);
            await fixDatabaseRecords(userJ.id);
        }
        return;
    }

    const userId = user.id;
    console.log(`Found user: ${userId} with email ${OLD_EMAIL}`);

    // 2. Corregir email en Auth
    console.log('--- Corrigiendo Auth ---');
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        email: NEW_EMAIL,
        user_metadata: { ...user.user_metadata, email: NEW_EMAIL }
    });

    if (authError) {
        console.error('❌ Error actualizando Auth:', authError);
    } else {
        console.log(`✅ Auth actualizado: ${NEW_EMAIL}`);
    }

    await fixDatabaseRecords(userId);
}

async function fixDatabaseRecords(userId) {
    // 3. Corregir email en Profiles
    console.log('--- Corrigiendo Profiles ---');
    const { error: profileError } = await supabase
        .from('profiles')
        .update({ email: NEW_EMAIL })
        .eq('id', userId);

    if (profileError) {
        console.error('❌ Error actualizando Profile:', profileError);
    } else {
        console.log(`✅ Profile actualizado: ${NEW_EMAIL}`);
    }

    // 4. Limpiar duplicados en Team Members
    console.log('--- Limpiando Team Members ---');
    const { data: members, error: membersFetchError } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', userId);

    if (membersFetchError) {
        console.error('❌ Error buscando miembros:', membersFetchError);
        return;
    }

    console.log(`Encontrados ${members.length} registros en team_members.`);

    if (members.length > 1) {
        // Dejamos el primero y borramos el resto
        const [keep, ...remove] = members;
        const removeIds = remove.map(m => m.id);
        
        console.log(`Borrando ${removeIds.length} duplicados...`);
        const { error: deleteError } = await supabase
            .from('team_members')
            .delete()
            .in('id', removeIds);

        if (deleteError) {
            console.error('❌ Error borrando duplicados:', deleteError);
        } else {
            console.log('✅ Duplicados eliminados.');
        }

        // Asegurar que el que quedó es owner
        if (keep.role !== 'owner') {
            const { error: roleError } = await supabase
                .from('team_members')
                .update({ role: 'owner' })
                .eq('id', keep.id);
            if (roleError) console.error('❌ Error actualizando rol:', roleError);
        }
    } else if (members.length === 1) {
        if (members[0].role !== 'owner') {
            await supabase.from('team_members').update({ role: 'owner' }).eq('id', members[0].id);
        }
        console.log('✅ Solo había un registro, rol asegurado como owner.');
    } else {
        console.log('⚠️ No se encontró registro en team_members. ¡Esto es el problema de raíz!');
        // Buscamos un equipo para asignarle o le creamos uno?
        // Según las migraciones, debería tener un equipo personal.
    }

    console.log('\n✨ Proceso de limpieza finalizado.');
}

fixPermissions();
