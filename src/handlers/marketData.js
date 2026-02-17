import { CONFIG } from '../config.js';
import { refreshToken } from '../utils/tokenManager.js';

function errorResponse(status, title, detail) {
    return new Response(JSON.stringify({
        errors: [{
            id: crypto.randomUUID(),
            status: String(status),
            title,
            detail
        }]
    }), { status, headers: { 'Content-Type': 'application/json' } });
}

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
        // Support both 'symbols' (preferred) and 'symbol' (legacy) parameters
        const symbols = url.searchParams.get('symbols') || url.searchParams.get('symbol');
        const fields = url.searchParams.get('fields');
        const indicative = url.searchParams.get('indicative');

        if (!symbols) {
            return errorResponse(400, "Bad Request", "Missing symbols parameter");
        }

        const accessToken = await getAccessToken(env);

        const endpoint = new URL(`${CONFIG.SCHWAB.BASE_URL}/quotes`);
        endpoint.searchParams.set('symbols', symbols);
        if (fields) {
            endpoint.searchParams.set('fields', fields);
        }
        if (indicative) {
            endpoint.searchParams.set('indicative', indicative);
        }

        const data = await fetchWithAuth(endpoint.toString(), accessToken, env);

        return new Response(JSON.stringify(data, null, 2), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return errorResponse(500, "Internal Server Error", error.message);
    }
}

export async function handlePriceHistoryRequest(request, env) {
    try {
        const url = new URL(request.url);
        const symbol = url.searchParams.get('symbol');

        if (!symbol) {
            return errorResponse(400, "Bad Request", "Missing symbol parameter");
        }

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
        return errorResponse(500, "Internal Server Error", error.message);
    }
}

const VALID_SYMBOLS = ['$DJI', '$COMPX', '$SPX', 'NYSE', 'NASDAQ', 'OTCBB', 'INDEX_ALL', 'EQUITY_ALL', 'OPTION_ALL', 'OPTION_PUT', 'OPTION_CALL'];
const VALID_SORTS = ['VOLUME', 'TRADES', 'PERCENT_CHANGE_UP', 'PERCENT_CHANGE_DOWN'];
const VALID_FREQUENCIES = ['0', '1', '5', '10', '30', '60'];
const VALID_MARKETS = ['equity', 'option', 'bond', 'future', 'forex'];

export async function handleMoversRequest(request, env, symbolId) {
    try {
        if (!symbolId) {
            return errorResponse(400, "Bad Request", "Missing symbol_id path parameter");
        }

        // Normalize symbol (handle with or without $)
        const normalizedSymbol = symbolId.startsWith('$') ? symbolId :
            ['DJI', 'COMPX', 'SPX'].includes(symbolId) ? `$${symbolId}` : symbolId;

        if (!VALID_SYMBOLS.includes(normalizedSymbol)) {
            return errorResponse(400, "Bad Request", `Invalid symbol_id. Valid values: ${VALID_SYMBOLS.join(', ')}`);
        }

        const url = new URL(request.url);
        const sort = url.searchParams.get('sort');
        const frequency = url.searchParams.get('frequency');

        if (sort && !VALID_SORTS.includes(sort)) {
            return errorResponse(400, "Bad Request", `Invalid sort parameter. Valid values: ${VALID_SORTS.join(', ')}`);
        }

        if (frequency && !VALID_FREQUENCIES.includes(frequency)) {
            return errorResponse(400, "Bad Request", `Invalid frequency parameter. Valid values: ${VALID_FREQUENCIES.join(', ')}`);
        }

        const accessToken = await getAccessToken(env);

        const apiUrl = new URL(`${CONFIG.SCHWAB.BASE_URL}/movers/${encodeURIComponent(normalizedSymbol)}`);

        if (sort) {
            apiUrl.searchParams.set('sort', sort);
        }
        if (frequency) {
            apiUrl.searchParams.set('frequency', frequency);
        }

        const data = await fetchWithAuth(apiUrl.toString(), accessToken, env);

        return new Response(JSON.stringify(data, null, 2), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return errorResponse(500, "Internal Server Error", error.message);
    }
}

export async function handleMarketsRequest(request, env) {
    try {
        const url = new URL(request.url);
        const marketsParam = url.searchParams.get('markets');
        const date = url.searchParams.get('date');

        if (!marketsParam) {
            return errorResponse(400, "Bad Request", "Missing required 'markets' parameter. Valid values: " + VALID_MARKETS.join(', '));
        }

        // Parse and validate markets
        const markets = marketsParam.split(',').map(m => m.trim().toLowerCase());
        const invalidMarkets = markets.filter(m => !VALID_MARKETS.includes(m));

        if (invalidMarkets.length > 0) {
            return errorResponse(400, "Bad Request", `Invalid market(s): ${invalidMarkets.join(', ')}. Valid values: ${VALID_MARKETS.join(', ')}`);
        }

        // Validate date format if provided (YYYY-MM-DD)
        if (date) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(date)) {
                return errorResponse(400, "Bad Request", "Invalid date format. Use YYYY-MM-DD");
            }

            const parsedDate = new Date(date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const oneYearFromNow = new Date(today);
            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

            if (parsedDate < today || parsedDate > oneYearFromNow) {
                return errorResponse(400, "Bad Request", "Date must be between today and 1 year from today");
            }
        }

        const accessToken = await getAccessToken(env);

        const apiUrl = new URL(`${CONFIG.SCHWAB.BASE_URL}/markets`);
        apiUrl.searchParams.set('markets', markets.join(','));

        if (date) {
            apiUrl.searchParams.set('date', date);
        }

        const data = await fetchWithAuth(apiUrl.toString(), accessToken, env);

        return new Response(JSON.stringify(data, null, 2), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return errorResponse(500, "Internal Server Error", error.message);
    }
}
