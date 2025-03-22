export async function handleAuthorize(authorizationEndpoint, clientId, redirectUri) {
    const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
    });

    const authorizationUrl = `${authorizationEndpoint}?${params.toString()}`;

    return Response.redirect(authorizationUrl, 302);
}