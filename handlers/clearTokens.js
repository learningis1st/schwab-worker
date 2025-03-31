export async function handleClearTokens(env) {
    try {
        await env.SCHWAB_TOKENS.delete('access_token');
        await env.SCHWAB_TOKENS.delete('refresh_token');
        await env.SCHWAB_TOKENS.delete('last_refreshed');
        
        return new Response(
            `<html>
                <head>
                    <meta http-equiv="refresh" content="3;url=/" />
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 800px;
                            margin: 0 auto;
                            padding: 20px;
                            text-align: center;
                        }
                        .container {
                            background-color: #f9f9f9;
                            border-radius: 8px;
                            padding: 20px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                            margin-top: 50px;
                        }
                        h2 {
                            color: #2c3e50;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>Tokens Cleared Successfully</h2>
                        <p>All authentication tokens have been removed.</p>
                        <p>Redirecting you to the home page in 3 seconds...</p>
                        <p><a href="/">Click here if you are not redirected automatically</a></p>
                    </div>
                </body>
            </html>`,
            {
                headers: { 'Content-Type': 'text/html' },
                status: 200
            }
        );
    } catch (error) {
        console.error("Error clearing tokens:", error);
        return new Response(
            `Error clearing tokens: ${error.message}`, 
            { status: 500 }
        );
    }
}
