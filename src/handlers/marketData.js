import { CONFIG } from '../config.js';
import { refreshToken } from '../utils/tokenManager.js';

async function fetchWithAuth(url, accessToken, env, options = {}) {
    const headers = new Headers(options.headers);

    headers.set('Authorization', `Bearer ${accessToken}`);
    headers.set('Accept', 'application/json');
    headers.set('Schwab-Client-CorrelId', crypto.randomUUID());

    const fetchOptions = {
        ...options,
        headers: headers,
    };

    let response = await fetch(url, fetchOptions);

    // Retry once if unauthorized
    if (response.status === 401 || response.status === 403) {
        console.log("Access token expired. Refreshing and retrying.");

        const newAccessToken = await refreshToken(env, accessToken);

        fetchOptions.headers.set('Authorization', `Bearer ${newAccessToken}`);

        response = await fetch(url, fetchOptions);
    }

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API request failed: ${response.status} - ${text}`);
    }

    return response.json();
}

async function getAccessToken(env) {
    let accessToken = await env.SCHWAB_TOKENS.get('access_token');
    if (!accessToken) {
        accessToken = await refreshToken(env, null);
    }
    return accessToken;
}

export async function handleQuoteRequest(request, env) {
    try {
        const url = new URL(request.url);
        const symbol = url.searchParams.get('symbol');
        const fields = url.searchParams.get('fields');

        if (!symbol) return new Response('Error: Missing symbol parameter.', { status: 400 });

        const accessToken = await getAccessToken(env);

        const endpoint = new URL(`${CONFIG.SCHWAB.BASE_URL}/quotes`);
        endpoint.searchParams.set('symbols', symbol);
        endpoint.searchParams.set('fields', fields || 'all');

        const data = await fetchWithAuth(endpoint.toString(), accessToken, env);

        return new Response(JSON.stringify(data, null, 2), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(`Error: ${error.message}`, { status: 500 });
    }
}

export async function handlePriceHistoryRequest(request, env) {
    try {
        const url = new URL(request.url);
        const symbol = url.searchParams.get('symbol');

        if (!symbol) return new Response('Error: Missing symbol parameter.', { status: 400 });

        const accessToken = await getAccessToken(env);

        const apiUrl = new URL(`${CONFIG.SCHWAB.BASE_URL}/pricehistory`);

        const allowedParams = [
            'symbol',
            'periodType',
            'period',
            'frequencyType',
            'frequency',
            'startDate',
            'endDate',
            'needExtendedHoursData',
            'needPreviousClose'
        ];

        for (const param of allowedParams) {
            if (url.searchParams.has(param)) {
                apiUrl.searchParams.set(param, url.searchParams.get(param));
            }
        }

        const data = await fetchWithAuth(apiUrl.toString(), accessToken, env);

        return new Response(JSON.stringify(data, null, 2), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(`Error: ${error.message}`, { status: 500 });
    }
}