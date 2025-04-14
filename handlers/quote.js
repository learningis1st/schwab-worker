import { refreshToken } from './refreshToken.js';

async function fetchQuote(symbol, fields, accessToken) {
    let quoteEndpoint = `https://api.schwabapi.com/marketdata/v1/${symbol}/quotes`;

    if (fields) {
        quoteEndpoint += `?fields=${fields}`;
    }

    const response = await fetch(quoteEndpoint, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'Schwab-Client-CorrelId': crypto.randomUUID(),
        },
    });

    const responseText = await response.text();

    if (!response.ok) {
        console.error('Quote API Error:', response.status, responseText);
        throw new Error(`Quote API request failed: ${response.status} - ${responseText}`);
    }

    return JSON.parse(responseText);
}

export async function handleQuoteRequest(request, env) {
    try {
        const url = new URL(request.url);
        const symbol = url.searchParams.get('symbol');
        const fields = url.searchParams.get('fields');

        if (!symbol) {
            return new Response('Error: Missing symbol parameter.', { status: 400 });
        }

        let accessToken = await env.SCHWAB_TOKENS.get('access_token');

        if (!accessToken) {
            try {
                accessToken = await refreshToken(env);
            } catch (refreshError) {
                console.error("Token refresh failed:", refreshError);
                return new Response("Error: No access token found and refresh failed. Please authorize first.", { status: 401 });
            }
        }

        try {
            const quoteData = await fetchQuote(symbol, fields, accessToken);
            return new Response(JSON.stringify(quoteData, null, 2), {
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (quoteError) {
            if (quoteError.message.includes('401') || quoteError.message.includes('403')) {
                console.log("Access token expired. Refreshing and retrying.");
                try {
                    accessToken = await refreshToken(env);
                    const quoteData = await fetchQuote(symbol, fields, accessToken);
                    return new Response(JSON.stringify(quoteData, null, 2), {
                        headers: { 'Content-Type': 'application/json' },
                    });
                } catch (refreshRetryError) {
                    console.error("Token refresh and retry failed:", refreshRetryError);
                    return new Response(`Error: Token refresh failed after quote attempt: ${refreshRetryError.message}`, { status: 500 });
                }
            }
            throw quoteError;
        }

    } catch (error) {
        console.error("Error fetching quote:", error);
        return new Response(`Error fetching quote: ${error.message}`, { status: 500 });
    }
}
