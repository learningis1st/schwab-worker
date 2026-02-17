import { handleOptions, corsHeaders } from './utils/cors.js';
import { handleAuthorize, handleCallback, handleClearTokens } from './handlers/auth.js';
import { handleQuoteRequest, handlePriceHistoryRequest, handleMoversRequest, handleMarketsRequest } from './handlers/marketData.js';
import { handleLandingPage } from './handlers/ui.js';
import { refreshToken } from './utils/tokenManager.js';

export default {
    async fetch(request, env, ctx) {
        if (request.method === "OPTIONS") {
            return handleOptions(request);
        }

        const url = new URL(request.url);
        const clientId = env.SCHWAB_APP_KEY;
        const clientSecret = env.SCHWAB_APP_SECRET;
        const redirectUri = `${url.origin}/callback`;

        let response;

        try {
            // Handle /movers/{symbol_id} path
            if (url.pathname.startsWith('/movers/')) {
                const symbolId = decodeURIComponent(url.pathname.substring('/movers/'.length));
                response = await handleMoversRequest(request, env, symbolId);
            } else {
                switch (url.pathname) {
                    case '/':
                        response = await handleLandingPage(env);
                        break;
                    case '/authorize':
                        response = await handleAuthorize(clientId, redirectUri);
                        break;
                    case '/callback':
                        response = await handleCallback(request, clientId, clientSecret, redirectUri, env);
                        break;
                    case '/quote':
                        response = await handleQuoteRequest(request, env);
                        break;
                    case '/pricehistory':
                        response = await handlePriceHistoryRequest(request, env);
                        break;
                    case '/markets':
                        response = await handleMarketsRequest(request, env);
                        break;
                    case '/clear-tokens':
                        response = await handleClearTokens(env);
                        break;
                    default:
                        response = new Response('Not Found.', { status: 404 });
                }
            }
        } catch (e) {
            response = new Response(`Internal Error: ${e.message}`, { status: 500 });
        }

        // Attach CORS headers
        const newHeaders = new Headers(response.headers);
        for (const [key, value] of Object.entries(corsHeaders)) {
            newHeaders.set(key, value);
        }

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
        });
    },

    async scheduled(event, env, ctx) {
        console.log("Cron Trigger detected: Refreshing Schwab Token...");

        ctx.waitUntil(
            (async () => {
                try {
                    const newToken = await refreshToken(env);
                    console.log(`Token refreshed successfully via Cron. Length: ${newToken.length}`);
                } catch (error) {
                    console.error("CRITICAL: Failed to refresh token during Cron Job:", error);
                }
            })()
        );
    }
};