// Setup for Supabase Edge Function: livekit-token
// This file is intended to be deployed to Supabase Functions.
// Path: supabase/functions/livekit-token/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { AccessToken } from 'https://esm.sh/livekit-server-sdk@1.2.7';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { roomName, participantName, participantId } = await req.json();

        if (!roomName || !participantName) {
            throw new Error('Missing roomName or participantName');
        }

        // Get keys from env
        const apiKey = Deno.env.get('LIVEKIT_API_KEY');
        const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');

        if (!apiKey || !apiSecret) {
            throw new Error('LiveKit keys not configured');
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: participantId || participantName,
            name: participantName,
        });

        at.addGrant({ roomJoin: true, room: roomName });

        const token = await at.toJwt(); // async as of newer SDKs? Or sync? 
        // SDK 1.2.7 toJwt is sync usually, checking docs... it returns string.

        return new Response(JSON.stringify({ token }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
