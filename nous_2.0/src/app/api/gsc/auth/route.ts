
import { google } from 'googleapis';
import { supabase } from '@/lib/supabase';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

export async function POST(req: Request) {
    const { code } = await req.json();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const { data: { user } } = await supabase.auth.getUser();

    if (user && tokens.refresh_token) {
        // Store refresh token securely ideally encrypting it
        // For MVP storing in project settings or user profile
        await supabase.from('projects')
            .update({ google_refresh_token: tokens.refresh_token, gsc_connected: true })
            .eq('user_id', user.id);
    }

    return Response.json({ success: true });
}
