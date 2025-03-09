addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const {pathname} = new URL(request.url);

    // Handle CORS Preflight (OPTIONS) Requests
    if (request.method === 'OPTIONS') {
        return handlePreflight();
    }

    // Determine the API based on the pathname
    const apiUrl = routeApi(pathname);
    if (!apiUrl) {
        return new Response('Not Found', {status: 404});
    }

    try {
        // Forward the request to the respective API
        const response = await fetch(apiUrl, {
            method: request.method,
            headers: request.headers,
            body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
        });

        return handleApiResponse(response);
    } catch (error) {
        return new Response(`Error fetching data: ${error.message}`, {
            status: 500,
            headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
}

// Handles preflight (OPTIONS) requests
function handlePreflight() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': '*',
        },
    });
}

// Routes API paths to their respective URLs
function routeApi(pathname) {
    const routes = {
        '/keys': 'https://xxxxxxxxxx',
        '/wg': 'https://api.cloudflareclient.com/v0a2158/reg',
    };
    return routes[pathname] || null;
}

// Handles and modifies the API response
async function handleApiResponse(response) {
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', '*');

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
    });
}
