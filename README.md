# Schwab Market Data API Worker

A Cloudflare Worker that interfaces with the Schwab API for market data access.

## Features
- **OAuth2 Authentication**: Automated flow to retrieve and store Access/Refresh tokens.
- **Auto-Refresh**: Cron trigger refreshes tokens every 20 minutes to prevent expiration.
- **Market Data**: Endpoints for Stock Quotes, Price History, Market Movers, and Market Hours.
- **UI Dashboard**: Built-in landing page to view token status and test endpoints.
- **KV Storage**: Securely stores tokens using Cloudflare KV.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Dashboard with status and documentation |
| `GET /authorize` | Initiates Schwab OAuth login |
| `GET /callback` | OAuth callback handler |
| `GET /quote?symbols=AAPL,MSFT` | Get real-time quotes for one or more symbols |
| `GET /pricehistory?symbol=AAPL` | Get historical candle data |
| `GET /movers/$DJI` | Get top movers for an index |
| `GET /markets?markets=equity` | Get market hours |
| `GET /clear-tokens` | Force clear stored tokens |

## Setup

1. **Prerequisites**
   - Cloudflare account with Workers enabled.
   - [Schwab Developer account](https://developer.schwab.com/) (App Key & Secret).

2. **Configuration**
   - Create a KV Namespace:
     ```bash
     wrangler kv namespace create schwab_tokens
     ```
   - Update the `id` in `wrangler.toml` under `kv_namespaces` with the new ID.

3. **Secrets**
   - Set your Schwab API credentials:
     ```bash
     wrangler secret put SCHWAB_APP_KEY
     wrangler secret put SCHWAB_APP_SECRET
     ```

4. **Deploy**
   ```bash
   wrangler deploy
   ```

## Notes
- Schwab refresh tokens expire after 7 days, requiring re-authorization.
- The cron job keeps access tokens fresh but cannot extend the refresh token lifetime.
