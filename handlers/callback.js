export async function handleCallback(request, tokenEndpoint, clientId, clientSecret, redirectUri, env) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (!code) {
        return new Response('Error: No code received from Schwab.', { status: 400 });
    }

    // Token Exchange
    const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
    });

    const encodedCredentials = btoa(`${clientId}:${clientSecret}`);

    const tokenResponse = await fetch(tokenEndpoint, {
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
        console.error('No access token received in token response:', tokenData);
        return new Response('Error: No access token received from Schwab.', { status: 500 });
    }

    // Store Tokens Securely
    await env.SCHWAB_TOKENS.put('access_token', accessToken);
    await env.SCHWAB_TOKENS.put('refresh_token', refreshToken);

    // Success Response
    return new Response(
        'Authentication Successful! Tokens stored securely.',
        { headers: { 'Content-Type': 'text/plain' }, status: 200 }
    );
}