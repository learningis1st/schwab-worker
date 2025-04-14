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

    const responseText = await tokenResponse.text();

    if (!tokenResponse.ok) {
        console.error('Refresh Token Exchange Error:', tokenResponse.status, responseText);
        throw new Error(`Refresh token exchange failed: ${tokenResponse.status} - ${responseText}`);
    }

    const tokenData = JSON.parse(responseText);
    const newAccessToken = tokenData.access_token;
    const newRefreshToken = tokenData.refresh_token || refreshTokenValue; // Use the old refresh token if a new one is not provided

    if (!newAccessToken) {
        console.error('No access token received in refresh token response:', tokenData);
        throw new Error('Error: No access token received from Schwab during refresh.');
    }

    await env.SCHWAB_TOKENS.put('access_token', newAccessToken);
    if (newRefreshToken !== refreshTokenValue) {
        await env.SCHWAB_TOKENS.put('refresh_token', newRefreshToken);
    }

    // Store the last refreshed time
    await env.SCHWAB_TOKENS.put('last_refreshed', Date.now().toString());

    return newAccessToken;
}
