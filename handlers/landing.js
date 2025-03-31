async function checkTokenStatus(env) {
    const accessToken = await env.SCHWAB_TOKENS.get('access_token');
    const refreshToken = await env.SCHWAB_TOKENS.get('refresh_token');
    const lastRefreshedTimestamp = await env.SCHWAB_TOKENS.get('last_refreshed');
    
    let lastRefreshed = 'Never';
    if (lastRefreshedTimestamp) {
        const date = new Date(parseInt(lastRefreshedTimestamp));
        lastRefreshed = date.toLocaleString();
    }
    
    return {
        status: accessToken && refreshToken ? "authorized" : "unauthorized",
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        lastRefreshed: lastRefreshed
    };
}

export async function handleLandingPage(env) {
    const tokenStatus = await checkTokenStatus(env);
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Market Data API</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            color: #2c3e50;
        }
        h3 {
            margin-top: 20px;
            margin-bottom: 10px;
        }
        .container {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        code {
            background-color: #f1f1f1;
            padding: 2px 5px;
            border-radius: 3px;
            font-family: monospace;
        }
        .btn {
            display: inline-block;
            padding: 10px 15px;
            background-color: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            margin-right: 10px;
            margin-bottom: 10px;
        }
        .btn:hover {
            background-color: #2980b9;
        }
        .btn-danger {
            background-color: #e74c3c;
        }
        .btn-danger:hover {
            background-color: #c0392b;
        }
        .btn-success {
            background-color: #2ecc71;
        }
        .btn-success:hover {
            background-color: #27ae60;
        }
        .parameter-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        .parameter-table th, .parameter-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        .parameter-table th {
            background-color: #f2f2f2;
        }
        .section {
            margin-bottom: 25px;
        }
        .response-example {
            background-color: #f8f8f8;
            padding: 10px;
            border-radius: 5px;
            border-left: 4px solid #3498db;
            overflow: auto;
            font-family: monospace;
            font-size: 0.9em;
        }
        .token-status {
            margin: 15px 0;
            padding: 15px;
            border-radius: 5px;
            background-color: ${tokenStatus.status === "authorized" ? "#e8f5e9" : "#ffebee"};
            border-left: 4px solid ${tokenStatus.status === "authorized" ? "#4caf50" : "#f44336"};
        }
        .auth-notice {
            margin-bottom: 15px; 
            padding: 12px; 
            background-color: #fff3cd; 
            border-left: 4px solid #ffc107; 
            border-radius: 4px;
        }
        footer {
            margin-top: 30px;
            text-align: center;
            font-size: 0.9em;
            color: #7f8c8d;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Schwab Market Data API</h1>

        <div class="section">
            <h2>Overview</h2>
            <p>
                Access financial data from Schwab API for real-time stock quotes and historical prices.
            </p>
        </div>

        <div class="section">
            <h2>Authentication</h2>
            <div class="token-status">
                <h3>Token Status: ${tokenStatus.status === "authorized" ? "Authorized ✓" : "Not Authorized ✗"}</h3>
                <p>
                    <strong>Access Token:</strong> ${tokenStatus.hasAccessToken ? "Present" : "Missing"}<br>
                    <strong>Refresh Token:</strong> ${tokenStatus.hasRefreshToken ? "Present" : "Missing"}<br>
                    <strong>Last Refreshed:</strong> ${tokenStatus.lastRefreshed}
                </p>
            </div>
            <div class="auth-notice">
            <strong>⚠️ Important:</strong> Schwab API requires re-authentication every 7 days as refresh tokens expire after this period. You'll need to re-authorize when tokens expire.
            </div>
            <p>
                <a href="/authorize" class="btn ${tokenStatus.status === "authorized" ? "" : "btn-success"}">
                    ${tokenStatus.status === "authorized" ? "Re-Authorize with Schwab" : "Authorize with Schwab"}
                </a>
                ${tokenStatus.status === "authorized" ? `<a href="/clear-tokens" class="btn btn-danger">Clear Tokens & Force Re-Authorization</a>` : ""}
            </p>
        </div>

        <div class="section">
            <h2>Available Endpoints</h2>

            <h3>Stock Quotes</h3>
            <p>
                <code>GET /quote?symbol=AAPL</code>
            </p>
            
            <table class="parameter-table">
                <tr>
                    <th>Parameter</th>
                    <th>Description</th>
                    <th>Values</th>
                </tr>
                <tr>
                    <td>symbol</td>
                    <td>Stock symbol (required)</td>
                    <td>Any valid stock symbol (e.g., AAPL, MSFT)</td>
                </tr>
                <tr>
                    <td>fields</td>
                    <td>Filter data by root nodes</td>
                    <td>quote, fundamental, reference, extended, regular, all<br>(Default: all)</td>
                </tr>
            </table>

            <p><strong>Returns:</strong> Current price, bid/ask, change, volume, and other trading metrics.</p>
            
            <h4>Example Requests</h4>
            <a href="/quote?symbol=AAPL" class="btn">Apple (AAPL)</a>
            <a href="/quote?symbol=MSFT" class="btn">Microsoft (MSFT)</a>
            <a href="/quote?symbol=TSLA" class="btn">Tesla (TSLA)</a>
            <a href="/quote?symbol=AAPL&fields=quote,reference" class="btn">AAPL (quote & reference)</a>

            <h3>Price History</h3>
            <p>
                <code>GET /pricehistory?symbol=AAPL&periodType=year&period=1&frequencyType=daily</code>
            </p>

            <table class="parameter-table">
                <tr>
                    <th>Parameter</th>
                    <th>Description</th>
                    <th>Valid Values</th>
                </tr>
                <tr>
                    <td>symbol</td>
                    <td>Stock symbol (required)</td>
                    <td>Any valid stock symbol (e.g., AAPL, MSFT)</td>
                </tr>
                <tr>
                    <td>periodType</td>
                    <td>Chart period type</td>
                    <td>day, month, year, ytd</td>
                </tr>
                <tr>
                    <td>period</td>
                    <td>Number of periods</td>
                    <td>
                        day: 1, 2, 3, 4, 5, 10 (default: 10)<br>
                        month: 1, 2, 3, 6 (default: 1)<br>
                        year: 1, 2, 3, 5, 10, 15, 20 (default: 1)<br>
                        ytd: 1 (default: 1)
                    </td>
                </tr>
                <tr>
                    <td>frequencyType</td>
                    <td>Time frequency type</td>
                    <td>
                        For day: minute<br>
                        For month: daily, weekly<br>
                        For year: daily, weekly, monthly<br>
                        For ytd: daily, weekly
                    </td>
                </tr>
                <tr>
                    <td>frequency</td>
                    <td>Time frequency value</td>
                    <td>
                        minute: 1, 5, 10, 15, 30<br>
                        daily: 1<br>
                        weekly: 1<br>
                        monthly: 1<br>
                        (Default for all: 1)
                    </td>
                </tr>
                <tr>
                    <td>startDate</td>
                    <td>Start date (milliseconds)</td>
                    <td>Integer timestamp (e.g., 1640995200000)</td>
                </tr>
                <tr>
                    <td>endDate</td>
                    <td>End date (milliseconds)</td>
                    <td>Integer timestamp (e.g., 1672531200000)</td>
                </tr>
                <tr>
                    <td>needExtendedHoursData</td>
                    <td>Include extended hours data</td>
                    <td>true, false</td>
                </tr>
                <tr>
                    <td>needPreviousClose</td>
                    <td>Include previous close</td>
                    <td>true, false</td>
                </tr>
            </table>
            
            <p><strong>Returns:</strong> Candle data with open, high, low, close, volume, and datetime.</p>

            <h4>Example Requests</h4>
            <a href="/pricehistory?symbol=AAPL&periodType=day&period=5&frequencyType=minute&frequency=5" class="btn">5-Day (5min candles)</a>
            <a href="/pricehistory?symbol=AAPL&periodType=month&period=3&frequencyType=daily" class="btn">3-Month Daily</a>
            <a href="/pricehistory?symbol=AAPL&periodType=year&period=1&frequencyType=weekly" class="btn">1-Year Weekly</a>
            <a href="/pricehistory?symbol=AAPL&periodType=ytd&frequencyType=daily" class="btn">Year-to-Date</a>
        </div>
    </div>

    <footer>
        &copy; ${new Date().getFullYear()} learningis1st | Powered by Cloudflare Workers
    </footer>
</body>
</html>`;

    return new Response(html, {
        headers: { 'Content-Type': 'text/html' },
        status: 200
    });
}
