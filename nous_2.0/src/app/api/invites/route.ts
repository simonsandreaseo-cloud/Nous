import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Use service role if available to bypass RLS in the API route, or anon key if not.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { projectId, email, role, custom_permissions, inviterId, inviterName, projectName } = body;

        if (!projectId || !email) {
            return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
        }

        // Initialize Supabase admin client
        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

        // 1. Insert the invite into the database
        const { data: invite, error } = await supabaseAdmin
            .from('project_invites')
            .insert([{
                project_id: projectId,
                email,
                role: role || 'editor',
                custom_permissions: custom_permissions || {}
            }])
            .select('*')
            .single();

        if (error) {
            console.error("Error creating invite:", error);
            if (error.code === '23505') { // unique violation
                return NextResponse.json({ error: "Este usuario ya tiene una invitación pendiente para este proyecto." }, { status: 400 });
            }
            throw new Error(error.message);
        }

        // 2. Query profiles to see if the user already exists in the system
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        // 3. If user exists, create an in-app notification
        if (profile?.id) {
            await supabaseAdmin.from('notifications').insert([{
                user_id: profile.id,
                actor_id: inviterId || null,
                type: 'PROJECT_INVITE',
                title: 'Nueva Invitación de Proyecto',
                message: `${inviterName || 'Alguien'} te ha invitado al proyecto "${projectName || 'Desconocido'}" como ${role}.`,
                resource_link: invite.id, // Store invite ID here so we know what to accept
                is_read: false
            }]);
        }

        // 4. Here you would integrate with Resend, SendGrid, or any other email provider
        // e.g., await resend.emails.send({ to: email, subject: 'Invitación a proyecto', text: `Usa este token para unirte: ${invite.token}` })
        console.log(`[Email Mock] Envío de invitación a ${email} con token: ${invite.token}`);

        return NextResponse.json({
            success: true,
            message: "Invitación creada y simulación de correo enviada.",
            invite
        });

    } catch (e: any) {
        console.error("API error /invites:", e);
        return NextResponse.json({ error: "Error interno del servidor", details: e.message }, { status: 500 });
    }
}
