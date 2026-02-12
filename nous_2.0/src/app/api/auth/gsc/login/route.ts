import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

export async function GET() {
    // DEBUG: Verificamos si las variables están cargadas
    console.log("GOOGLE_CLIENT_ID loaded:", !!process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + "...");
    console.log("GOOGLE_CLIENT_SECRET loaded:", !!process.env.GOOGLE_CLIENT_SECRET);
    console.log("NEXT_PUBLIC_URL:", process.env.NEXT_PUBLIC_URL);

    const redirectUri = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/auth/gsc/callback`;

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
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
