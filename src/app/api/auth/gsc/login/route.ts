import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const redirectTo = searchParams.get('redirect') || '/settings';
    const scopeParam = searchParams.get('scope') || 'all';

    // Limpiamos las variables por si vienen con espacios o barras accidentales
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim().replace(/\/$/, '');
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    const publicUrl = process.env.NEXT_PUBLIC_URL?.trim().replace(/\/$/, '');

    const redirectUri = `${publicUrl || 'http://localhost:3000'}/api/auth/gsc/callback`;

    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
    );

    const SCOPE_MAP: Record<string, string[]> = {
        gsc: ['https://www.googleapis.com/auth/webmasters.readonly'],
        ga4: ['https://www.googleapis.com/auth/analytics.readonly'],
        drive: [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/documents',
            'https://www.googleapis.com/auth/presentations'
        ],
        all: [
            'https://www.googleapis.com/auth/webmasters.readonly',
            'https://www.googleapis.com/auth/analytics.readonly',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/documents'
        ]
    };

    const requestedScopes = [
        'https://www.googleapis.com/auth/userinfo.email',
        'openid',
        ...(SCOPE_MAP[scopeParam] || SCOPE_MAP.all)
    ];

    // Generate the url that will be used for the consent dialog.
    const authorizeUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Essential for getting a refresh token
        scope: requestedScopes,
        prompt: 'consent', // Force consent prompt to ensure refresh token is returned
        include_granted_scopes: true,
        state: redirectTo, // Use state to pass the return URL
        redirect_uri: redirectUri // FORCE explicit redirect_uri
    });

    return NextResponse.redirect(authorizeUrl);
}
