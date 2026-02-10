import { CONFIG } from '../config.js';

export async function refreshToken(env, failedAccessToken = null) {
    const currentAccessToken = await env.SCHWAB_TOKENS.get('access_token');

    if (failedAccessToken && currentAccessToken && currentAccessToken !== failedAccessToken) {
        console.log("Token already refreshed by another worker. Using new token.");
        return currentAccessToken;
    }

    const isRefreshing = await env.SCHWAB_TOKENS.get('refresh_lock');
    if (isRefreshing) {
        console.log("Refresh currently in progress. Waiting...");
        // Wait 2 seconds for the other worker to finish
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await env.SCHWAB_TOKENS.get('access_token');
    }

    await env.SCHWAB_TOKENS.put('refresh_lock', 'true', { expirationTtl: 60 });

    try {
        const refreshTokenValue = await env.SCHWAB_TOKENS.get('refresh_token');
        const clientId = env.SCHWAB_APP_KEY;
        const clientSecret = env.SCHWAB_APP_SECRET;

        if (!refreshTokenValue) {
            throw new Error("No refresh token found. Please authorize first.");
        }

        const tokenParams = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshTokenValue,
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

        const responseText = await tokenResponse.text();

        if (!tokenResponse.ok) {
            console.error('Refresh Token Exchange Error:', tokenResponse.status, responseText);
            throw new Error(`Refresh token exchange failed: ${tokenResponse.status} - ${responseText}`);
        }

        const tokenData = JSON.parse(responseText);
        const newAccessToken = tokenData.access_token;
        const newRefreshToken = tokenData.refresh_token || refreshTokenValue;

        if (!newAccessToken) {
            throw new Error('Error: No access token received from Schwab during refresh.');
        }

        await env.SCHWAB_TOKENS.put('access_token', newAccessToken);

        if (newRefreshToken !== refreshTokenValue) {
            await env.SCHWAB_TOKENS.put('refresh_token', newRefreshToken);
        }

        await env.SCHWAB_TOKENS.put('last_refreshed', Date.now().toString());

        return newAccessToken;

    } finally {
        await env.SCHWAB_TOKENS.delete('refresh_lock');
    }
}