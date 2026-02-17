import styles from './styles.css';

async function checkTokenStatus(env) {
    const [accessToken, refreshToken, lastRefreshedTimestamp] = await Promise.all([
        env.SCHWAB_TOKENS.get('access_token'),
        env.SCHWAB_TOKENS.get('refresh_token'),
        env.SCHWAB_TOKENS.get('last_refreshed')
    ]);

    return {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        isAuthorized: !!(accessToken && refreshToken),
        lastRefreshed: lastRefreshedTimestamp
            ? new Date(parseInt(lastRefreshedTimestamp)).toLocaleString()
            : 'Never'
    };
}

export async function handleLandingPage(env) {
    const token = await checkTokenStatus(env);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Market Data API</title>
    <style>${styles}</style>
</head>
<body class="${token.isAuthorized ? 'authorized' : ''}">
    <div class="container">
        <h1>Schwab Market Data API</h1>
        
        <div class="section">
            <h2>Overview</h2>
            <p>Access financial data from Schwab API for real-time stock quotes and historical prices.</p>
        </div>

        <div class="section">
            <h2>Authentication</h2>
            <div class="token-status">
                <h3>Token Status: ${token.isAuthorized ? "Authorized ✓" : "Not Authorized ✗"}</h3>
                <p>
                    <strong>Access Token:</strong> ${token.hasAccessToken ? "Present" : "Missing"}<br>
                    <strong>Refresh Token:</strong> ${token.hasRefreshToken ? "Present" : "Missing"}<br>
                    <strong>Last Refreshed:</strong> ${token.lastRefreshed}
                </p>
            </div>
            <div class="auth-notice">
                <strong>⚠️ Important:</strong> Schwab API requires re-authentication every 7 days as refresh tokens expire after this period. You'll need to re-authorize when tokens expire.
            </div>
            <p>
                <a href="/authorize" class="btn ${token.isAuthorized ? '' : 'btn-success'}">${token.isAuthorized ? 'Re-Authorize with Schwab' : 'Authorize with Schwab'}</a>
                ${token.isAuthorized ? '<a href="/clear-tokens" class="btn btn-danger">Clear Tokens & Force Re-Authorization</a>' : ''}
            </p>
        </div>

        <div class="section">
            <h2>Available Endpoints</h2>

            <h3>Stock Quotes</h3>
            <p><code>GET /quote?symbols=AAPL,MSFT,GOOGL</code></p>
            <table class="parameter-table">
                <tr><th>Parameter</th><th>Description</th><th>Values</th></tr>
                <tr><td>symbols</td><td>Comma-separated list of symbols (required)</td><td>Stock symbols (e.g., <code>AAPL</code>, <code>AAPL,MSFT,GOOGL</code>)<br>Also supports: indices (<code>$DJI</code>, <code>$SPX</code>), options, futures (<code>/ESH26</code>), forex (<code>EUR/USD</code>)</td></tr>
                <tr><td>fields</td><td>Filter response data by root nodes</td><td><code>quote</code>, <code>fundamental</code>, <code>reference</code>, <code>extended</code>, <code>regular</code>, <code>all</code> (default: <code>all</code>)</td></tr>
                <tr><td>indicative</td><td>Include indicative quotes for ETF symbols</td><td><code>true</code>, <code>false</code> (default: <code>false</code>)</td></tr>
            </table>
            <p><strong>Returns:</strong> Current price, bid/ask, change, volume, and other trading metrics.</p>
            <h4>Example Requests</h4>
            <a href="/quote?symbols=AAPL" class="btn">Apple (AAPL)</a>
            <a href="/quote?symbols=MSFT" class="btn">Microsoft (MSFT)</a>
            <a href="/quote?symbols=AAPL,MSFT,GOOGL" class="btn">Multiple Stocks</a>
            <a href="/quote?symbols=AAPL&fields=quote,reference" class="btn">AAPL (quote & reference)</a>
            <a href="/quote?symbols=$DJI,$SPX" class="btn">Indices ($DJI, $SPX)</a>
            <a href="/quote?symbols=SPY&indicative=true" class="btn">SPY with Indicative</a>

            <h3>Price History</h3>
            <p><code>GET /pricehistory?symbol=AAPL&periodType=year&period=1&frequencyType=daily</code></p>
            <p>Get historical Open, High, Low, Close, and Volume for a given frequency (aggregation).</p>
            <table class="parameter-table">
                <tr><th>Parameter</th><th>Description</th><th>Values</th></tr>
                <tr><td>symbol</td><td>Stock symbol (required)</td><td>Any valid equity symbol (e.g., <code>AAPL</code>, <code>MSFT</code>)</td></tr>
                <tr><td>periodType</td><td>Chart period type</td><td><code>day</code>, <code>month</code>, <code>year</code>, <code>ytd</code></td></tr>
                <tr><td>period</td><td>Number of periods</td><td><strong>By periodType:</strong><br>• day: <code>1, 2, 3, 4, 5, 10</code> (default: <code>10</code>)<br>• month: <code>1, 2, 3, 6</code> (default: <code>1</code>)<br>• year: <code>1, 2, 3, 5, 10, 15, 20</code> (default: <code>1</code>)<br>• ytd: <code>1</code> (default: <code>1</code>)</td></tr>
                <tr><td>frequencyType</td><td>Time frequency type</td><td><strong>By periodType:</strong><br>• day: <code>minute</code> (default: <code>minute</code>)<br>• month: <code>daily</code>, <code>weekly</code> (default: <code>weekly</code>)<br>• year: <code>daily</code>, <code>weekly</code>, <code>monthly</code> (default: <code>monthly</code>)<br>• ytd: <code>daily</code>, <code>weekly</code> (default: <code>weekly</code>)</td></tr>
                <tr><td>frequency</td><td>Time frequency duration</td><td><strong>By frequencyType:</strong><br>• minute: <code>1, 5, 10, 15, 30</code><br>• daily: <code>1</code><br>• weekly: <code>1</code><br>• monthly: <code>1</code><br>(default: <code>1</code>)</td></tr>
                <tr><td>startDate</td><td>Start date (EPOCH ms)</td><td>Integer timestamp (e.g., <code>1451624400000</code>). If not specified: (endDate - period) excluding weekends/holidays</td></tr>
                <tr><td>endDate</td><td>End date (EPOCH ms)</td><td>Integer timestamp (default: market close of previous business day)</td></tr>
                <tr><td>needExtendedHoursData</td><td>Include extended hours data</td><td><code>true</code>, <code>false</code></td></tr>
                <tr><td>needPreviousClose</td><td>Include previous close price/date</td><td><code>true</code>, <code>false</code></td></tr>
            </table>
            <p><strong>Returns:</strong> Candle data with open, high, low, close, volume, and datetime (EPOCH ms).</p>
            <h4>Example Requests</h4>
            <a href="/pricehistory?symbol=AAPL&periodType=day&period=5&frequencyType=minute&frequency=5" class="btn">5-Day (5min)</a>
            <a href="/pricehistory?symbol=AAPL&periodType=day&period=10&frequencyType=minute&frequency=1" class="btn">10-Day (1min)</a>
            <a href="/pricehistory?symbol=AAPL&periodType=day&period=1&frequencyType=minute&frequency=30" class="btn">1-Day (30min)</a>
            <a href="/pricehistory?symbol=AAPL&periodType=month&period=3&frequencyType=daily" class="btn">3-Month Daily</a>
            <a href="/pricehistory?symbol=AAPL&periodType=month&period=6&frequencyType=weekly" class="btn">6-Month Weekly</a>
            <a href="/pricehistory?symbol=AAPL&periodType=year&period=1&frequencyType=weekly" class="btn">1-Year Weekly</a>
            <a href="/pricehistory?symbol=AAPL&periodType=year&period=5&frequencyType=monthly" class="btn">5-Year Monthly</a>
            <a href="/pricehistory?symbol=AAPL&periodType=ytd&frequencyType=daily" class="btn">Year-to-Date Daily</a>
            <a href="/pricehistory?symbol=AAPL&periodType=year&period=1&frequencyType=daily&needPreviousClose=true" class="btn">1-Year + Previous Close</a>
            <a href="/pricehistory?symbol=AAPL&periodType=day&period=5&frequencyType=minute&frequency=5&needExtendedHoursData=true" class="btn">5-Day Extended Hours</a>

            <h3>Market Movers</h3>
            <p><code>GET /movers/$DJI?sort=PERCENT_CHANGE_UP&frequency=0</code></p>
            <p>Get top 10 securities movement for a specific index.</p>
            <table class="parameter-table">
                <tr><th>Parameter</th><th>Description</th><th>Values</th></tr>
                <tr><td>symbol_id (path)</td><td>Index Symbol (required)</td><td><code>$DJI</code>, <code>$COMPX</code>, <code>$SPX</code>, <code>NYSE</code>, <code>NASDAQ</code>, <code>OTCBB</code>, <code>INDEX_ALL</code>, <code>EQUITY_ALL</code>, <code>OPTION_ALL</code>, <code>OPTION_PUT</code>, <code>OPTION_CALL</code></td></tr>
                <tr><td>sort</td><td>Sort by attribute</td><td><code>VOLUME</code>, <code>TRADES</code>, <code>PERCENT_CHANGE_UP</code>, <code>PERCENT_CHANGE_DOWN</code></td></tr>
                <tr><td>frequency</td><td>Time frequency (minutes)</td><td><code>0</code>, <code>1</code>, <code>5</code>, <code>10</code>, <code>30</code>, <code>60</code> (default: <code>0</code>)</td></tr>
            </table>
            <p><strong>Returns:</strong> List of screeners with change, description, direction, last price, symbol, and volume.</p>
            <h4>Example Requests</h4>
            <a href="/movers/$DJI" class="btn">Dow Jones</a>
            <a href="/movers/$COMPX" class="btn">NASDAQ Composite</a>
            <a href="/movers/$SPX" class="btn">S&P 500</a>
            <a href="/movers/$DJI?sort=VOLUME" class="btn">$DJI by Volume</a>
            <a href="/movers/$DJI?sort=PERCENT_CHANGE_UP" class="btn">$DJI Gainers</a>
            <a href="/movers/$DJI?sort=PERCENT_CHANGE_DOWN" class="btn">$DJI Losers</a>

            <h3>Market Hours</h3>
            <p><code>GET /markets?markets=equity,option</code></p>
            <p>Get market hours for different markets (equity, option, bond, future, forex).</p>
            <table class="parameter-table">
                <tr><th>Parameter</th><th>Description</th><th>Values</th></tr>
                <tr><td>markets</td><td>Comma-separated list of markets (required)</td><td><code>equity</code>, <code>option</code>, <code>bond</code>, <code>future</code>, <code>forex</code></td></tr>
                <tr><td>date</td><td>Date for market hours</td><td>Format: <code>YYYY-MM-DD</code> (default: current day, max: 1 year from today)</td></tr>
            </table>
            <p><strong>Returns:</strong> Market hours including pre-market, regular market, and post-market sessions with open/close times.</p>
            <h4>Example Requests</h4>
            <a href="/markets?markets=equity" class="btn">Equity Hours</a>
            <a href="/markets?markets=option" class="btn">Option Hours</a>
            <a href="/markets?markets=equity,option" class="btn">Equity & Option</a>
            <a href="/markets?markets=equity,option,bond,future,forex" class="btn">All Markets</a>
        </div>
    </div>

    <footer>&copy; ${new Date().getFullYear()} learningis1st | Powered by Cloudflare Workers</footer>
</body>
</html>`;

    return new Response(html, {
        headers: { 'Content-Type': 'text/html' },
        status: 200
    });
}