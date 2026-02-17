export const CONFIG = {
    SCHWAB: {
        AUTHORIZATION_ENDPOINT: 'https://api.schwabapi.com/v1/oauth/authorize',
        TOKEN_ENDPOINT: 'https://api.schwabapi.com/v1/oauth/token',
        BASE_URL: 'https://api.schwabapi.com/marketdata/v1'
    },
    CORS: {
        ALLOW_ORIGIN: "*",
        ALLOW_METHODS: "GET, HEAD, POST, OPTIONS",
        ALLOW_HEADERS: "Content-Type, Authorization",
        MAX_AGE: "86400"
    }
};