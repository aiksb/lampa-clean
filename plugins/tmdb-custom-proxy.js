/**
 * Custom TMDB Proxy Plugin for Lampa
 * 
 * Instructions:
 * 1. Deploy workers/tmdb-proxy.js to Cloudflare Workers
 * 2. Replace PROXY_URL below with your worker URL
 * 3. Add this plugin to auto_load or install manually
 */

(function () {
    'use strict';

    // ============ CONFIGURE YOUR PROXY URL HERE ============
    const PROXY_URL = 'https://tmdb-proxy.YOUR-SUBDOMAIN.workers.dev';
    // ========================================================

    // Skip if already configured or URL not set
    if (PROXY_URL.includes('YOUR-SUBDOMAIN')) {
        console.log('[TMDB Custom Proxy] Not configured - edit PROXY_URL in the plugin');
        return;
    }

    // Override TMDB URLs
    const originalFetch = window.fetch;

    window.fetch = function (url, options) {
        if (typeof url === 'string') {
            // Replace TMDB API
            if (url.includes('api.themoviedb.org')) {
                url = url.replace('https://api.themoviedb.org', PROXY_URL);
            }
            // Replace TMDB Images
            if (url.includes('image.tmdb.org')) {
                url = url.replace('https://image.tmdb.org', PROXY_URL);
            }
            // Replace broken bylampa proxy
            if (url.includes('tmdblapi.bylampa.online')) {
                url = url.replace('https://tmdblapi.bylampa.online', PROXY_URL);
            }
            if (url.includes('tmdbapi.bylampa.online')) {
                url = url.replace('https://tmdbapi.bylampa.online', PROXY_URL);
            }
        }

        return originalFetch.call(this, url, options);
    };

    // Also handle XMLHttpRequest for older code
    const originalXHROpen = XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.open = function (method, url, ...args) {
        if (typeof url === 'string') {
            if (url.includes('api.themoviedb.org')) {
                url = url.replace('https://api.themoviedb.org', PROXY_URL);
            }
            if (url.includes('image.tmdb.org')) {
                url = url.replace('https://image.tmdb.org', PROXY_URL);
            }
            if (url.includes('tmdblapi.bylampa.online')) {
                url = url.replace('https://tmdblapi.bylampa.online', PROXY_URL);
            }
        }

        return originalXHROpen.call(this, method, url, ...args);
    };

    console.log('[TMDB Custom Proxy] Activated:', PROXY_URL);
})();
