import { refreshToken } from './refreshToken.js';

async function fetchPriceHistory(symbol, params, accessToken) {
    const baseUrl = 'https://api.schwabapi.com/marketdata/v1/pricehistory';

    // Construct URL with required symbol parameter
    const url = new URL(baseUrl);
    url.searchParams.append('symbol', symbol);

    // Add optional parameters if they exist
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
            url.searchParams.append(key, value);
        }
    }

    const response = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'Schwab-Client-CorrelId': crypto.randomUUID(),
        },
    });

    if (!response.ok) {
        const [responseClone1, responseClone2] = response.clone().body.tee();
        console.error('Price History API Error:', response.status, await new Response(responseClone1).text());
        throw new Error(`Price History API request failed: ${response.status} - ${await new Response(responseClone2).text()}`);
    }

    const data = await response.json();
    return data;
}

export async function handlePriceHistoryRequest(request, env) {
    try {
        const url = new URL(request.url);
        const symbol = url.searchParams.get('symbol');

        if (!symbol) {
            return new Response('Error: Missing symbol parameter.', { status: 400 });
        }

        // Extract optional parameters
        const params = {
            periodType: url.searchParams.get('periodType'),
            period: url.searchParams.get('period'),
            frequencyType: url.searchParams.get('frequencyType'),
            frequency: url.searchParams.get('frequency'),
            startDate: url.searchParams.get('startDate'),
            endDate: url.searchParams.get('endDate'),
            needExtendedHoursData: url.searchParams.get('needExtendedHoursData'),
            needPreviousClose: url.searchParams.get('needPreviousClose')
        };

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
            const priceHistoryData = await fetchPriceHistory(symbol, params, accessToken);
            return new Response(JSON.stringify(priceHistoryData, null, 2), {
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (apiError) {
            // If the request fails with the current token, try refreshing and retrying
            if (apiError.message.includes('401') || apiError.message.includes('403')) {
                console.log("Access token expired. Refreshing and retrying.");
                try {
                    accessToken = await refreshToken(env);
                    const priceHistoryData = await fetchPriceHistory(symbol, params, accessToken);
                    return new Response(JSON.stringify(priceHistoryData, null, 2), {
                        headers: { 'Content-Type': 'application/json' },
                    });
                } catch (refreshRetryError) {
                    console.error("Token refresh and retry failed:", refreshRetryError);
                    return new Response(`Error: Token refresh failed after price history attempt: ${refreshRetryError.message}`, { status: 500 });
                }
            }
            throw apiError;
        }

    } catch (error) {
        console.error("Error fetching price history:", error);
        return new Response(`Error fetching price history: ${error.message}`, { status: 500 });
    }
}
