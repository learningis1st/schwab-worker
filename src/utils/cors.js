import { CONFIG } from '../config.js';

export const corsHeaders = {
    "Access-Control-Allow-Origin": CONFIG.CORS.ALLOW_ORIGIN,
    "Access-Control-Allow-Methods": CONFIG.CORS.ALLOW_METHODS,
    "Access-Control-Allow-Headers": CONFIG.CORS.ALLOW_HEADERS,
    "Access-Control-Max-Age": CONFIG.CORS.MAX_AGE,
};

export function handleOptions(request) {
    if (
        request.headers.get("Origin") !== null &&
        request.headers.get("Access-Control-Request-Method") !== null &&
        request.headers.get("Access-Control-Request-Headers") !== null
    ) {
        return new Response(null, { headers: corsHeaders });
    } else {
        return new Response(null, {
            headers: { Allow: CONFIG.CORS.ALLOW_METHODS },
        });
    }
}