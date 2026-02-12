import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

export async function GET() {
    // Limpiamos las variables por si vienen con espacios o barras accidentales
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim().replace(/\/$/, '');
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    const publicUrl = process.env.NEXT_PUBLIC_URL?.trim().replace(/\/$/, '');

    // DEBUG: Verificamos si las variables están cargadas (ofuscado)
    console.log("GOOGLE_CLIENT_ID loaded:", !!clientId, clientId?.substring(0, 10) + "...");
    console.log("GOOGLE_CLIENT_SECRET loaded:", !!clientSecret);
    console.log("NEXT_PUBLIC_URL:", publicUrl);

    const redirectUri = `${publicUrl || 'http://localhost:3000'}/api/auth/gsc/callback`;

    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
    );

    // Generate the url that will be used for the consent dialog.
    const authorizeUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Essential for getting a refresh token
        scope: [
            'https://www.googleapis.com/auth/webmasters.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/spreadsheets',          // Read/Write Sheets
            'https://www.googleapis.com/auth/documents',             // Read/Write Docs
            'https://www.googleapis.com/auth/drive.file',            // Create/Manage specific files
            'https://www.googleapis.com/auth/presentations',         // Read/Write Slides
            'https://www.googleapis.com/auth/drive.readonly',        // Read Drive metadata
            'https://www.googleapis.com/auth/analytics.readonly'     // Read GA4 Data
        ],
        prompt: 'consent', // Force consent prompt to ensure refresh token is returned
        include_granted_scopes: true,
        redirect_uri: redirectUri // FORCE explicit redirect_uri
    });

    return NextResponse.redirect(authorizeUrl);
}
