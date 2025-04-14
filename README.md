# Schwab Market Data API Worker

A Cloudflare Worker that interfaces with the Schwab API for market data access.

## Features

- OAuth 2.0 authentication with Schwab
- Real-time stock quotes
- Historical price data

## Setup

1. Create a [Schwab Developer](https://developer.schwab.com/) account and API application
2. Set up a Cloudflare account and Workers KV namespace called `SCHWAB_TOKENS`
3. Deploy using `wrangler deploy`