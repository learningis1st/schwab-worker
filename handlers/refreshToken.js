export async function refreshToken(env) {
    const refreshTokenValue = await env.SCHWAB_TOKENS.get('refresh_token');
    const clientId = env.SCHWAB_APP_KEY;
    const clientSecret = env.SCHWAB_APP_SECRET;
    const tokenEndpoint = 'https://api.schwabapi.com/v1/oauth/token';

    if (!refreshTokenValue) {
        throw new Error("No refresh token found. Please authorize first.");
    }

    const tokenParams = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshTokenValue,
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
        console.error('Refresh Token Exchange Error:', tokenResponse.status, await tokenResponse.text());
        throw new Error(`Refresh token exchange failed: ${tokenResponse.status} - ${await tokenResponse.text()}`);
    }

    const tokenData = await tokenResponse.json();
    const newAccessToken = tokenData.access_token;
    const newRefreshToken = tokenData.refresh_token || refreshTokenValue; // Use existing if new one isn't provided.

    if (!newAccessToken) {
        console.error('No access token received in refresh token response:', tokenData);
        throw new Error('Error: No access token received from Schwab during refresh.');
    }

    await env.SCHWAB_TOKENS.put('access_token', newAccessToken);
    if (newRefreshToken !== refreshTokenValue) {
        await env.SCHWAB_TOKENS.put('refresh_token', newRefreshToken);
    }
    return newAccessToken;
}