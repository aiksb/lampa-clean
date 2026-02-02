/**
 * TMDB Proxy Worker for Lampa
 * 
 * Deploy to Cloudflare Workers:
 * 1. Go to dash.cloudflare.com
 * 2. Workers & Pages → Create Worker
 * 3. Paste this code
 * 4. Deploy
 * 5. Add custom domain (optional): tmdb.yourdomain.com
 */

export default {
    async fetch(request) {
        const url = new URL(request.url);

        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
                    'Access-Control-Allow-Headers': '*',
                    'Access-Control-Max-Age': '86400',
                }
            });
        }

        // Determine target
        let targetUrl;
        const path = url.pathname;

        if (path.startsWith('/t/p/')) {
            // Image requests - proxy to image.tmdb.org
            targetUrl = 'https://image.tmdb.org' + path;
        } else if (path.startsWith('/3/')) {
            // API requests - proxy to api.themoviedb.org
            targetUrl = 'https://api.themoviedb.org' + path + url.search;
        } else {
            return new Response('OK', {
                status: 200,
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        try {
            const response = await fetch(targetUrl, {
                method: request.method,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Lampa/3.1'
                }
            });

            // Clone and add CORS headers
            const newHeaders = new Headers(response.headers);
            newHeaders.set('Access-Control-Allow-Origin', '*');
            newHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');

            return new Response(response.body, {
                status: response.status,
                headers: newHeaders
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
    }
}
