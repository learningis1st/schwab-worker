import { CONFIG } from '../config.js';

export async function handleAuthorize(clientId, redirectUri) {
    const state = crypto.randomUUID();

    const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        state: state,
    });

    const authorizationUrl = `${CONFIG.SCHWAB.AUTHORIZATION_ENDPOINT}?${params.toString()}`;

    const headers = new Headers();
    headers.append('Location', authorizationUrl);
    headers.append('Set-Cookie', `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=300; Path=/`);

    return new Response(null, {
        status: 302,
        headers: headers
    });
}

export async function handleCallback(request, clientId, clientSecret, redirectUri, env) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');

    const cookieHeader = request.headers.get('Cookie');
    let storedState = null;
    if (cookieHeader) {
        const cookies = cookieHeader.split(';');
        for (const cookie of cookies) {
            const parts = cookie.trim().split('=');
            const name = parts[0];
            const value = parts.slice(1).join('=');

            if (name === 'oauth_state') {
                storedState = value;
                break;
            }
        }
    }

    if (!code) {
        return new Response('Error: No code received from Schwab.', { status: 400 });
    }
    if (!returnedState || !storedState || returnedState !== storedState) {
        return new Response('Error: Invalid state parameter. Possible CSRF attack or session expired.', { status: 400 });
    }

    const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
    });

    const encodedCredentials = btoa(`${clientId}:${clientSecret}`);

    const tokenResponse = await fetch(CONFIG.SCHWAB.TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${encodedCredentials}`,
        },
        body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
        console.error('Token Exchange Error:', tokenResponse.status, await tokenResponse.text());
        return new Response(`Token exchange failed: ${tokenResponse.status}`, { status: tokenResponse.status });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    if (!accessToken) {
        return new Response('Error: No access token received from Schwab.', { status: 500 });
    }

    await env.SCHWAB_TOKENS.put('access_token', accessToken);
    if (refreshToken) {
        await env.SCHWAB_TOKENS.put('refresh_token', refreshToken);
    }
    await env.SCHWAB_TOKENS.put('last_refreshed', Date.now().toString());

    const successHeaders = new Headers();
    successHeaders.append('Location', '/');
    successHeaders.append('Set-Cookie', 'oauth_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/');

    return new Response(null, {
        status: 302,
        headers: successHeaders
    });
}

export async function handleClearTokens(env) {
    try {
        await env.SCHWAB_TOKENS.delete('access_token');
        await env.SCHWAB_TOKENS.delete('refresh_token');
        await env.SCHWAB_TOKENS.delete('last_refreshed');

        return new Response(
            `<html><head><meta http-equiv="refresh" content="3;url=/" /></head>
            <body><h2>Tokens Cleared</h2><p>Redirecting...</p></body></html>`,
            { headers: { 'Content-Type': 'text/html' }, status: 200 }
        );
    } catch (error) {
        console.error("Error clearing tokens:", error);
        return new Response(`Error clearing tokens: ${error.message}`, { status: 500 });
    }
}