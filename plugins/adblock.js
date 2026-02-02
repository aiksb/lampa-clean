/**
 * Lampa Clean - Ad Blocker v1.0
 * 
 * Clean ad blocking without domain locks.
 * Based on analysis of obfuscated bylampa/cub_off.js but rewritten from scratch.
 * 
 * Blocks:
 * - Pre-roll ads before movies
 * - CUB Premium nags
 * - Various promotional banners
 * - Subscription buttons
 */

(function () {
    'use strict';

    console.log('[Lampa Clean AdBlock] Initializing...');

    // ==================== LAMPA SETTINGS OVERRIDES ====================
    // Disable all premium/ad features at the settings level
    window.lampa_settings = window.lampa_settings || {};
    window.lampa_settings.socket_use = false;
    window.lampa_settings.socket_url = undefined;
    window.lampa_settings.socket_methods = false;
    window.lampa_settings.account_use = true;
    window.lampa_settings.account_sync = true;
    window.lampa_settings.plugins_use = true;
    window.lampa_settings.plugins_store = true;
    window.lampa_settings.torrents_use = true;
    window.lampa_settings.nodemo = false;
    window.lampa_settings.lang_use = true;
    window.lampa_settings.read_only = false;
    window.lampa_settings.install_proxy = false;
    window.lampa_settings.push_state = true;
    window.lampa_settings.nopremium = false;
    window.lampa_settings.blacklist = false;
    window.lampa_settings.geo = false;
    window.lampa_settings.white_use = true;

    // Disable premium features
    window.lampa_settings.disable_features = window.lampa_settings.disable_features || {};
    window.lampa_settings.disable_features.dmca = true;
    window.lampa_settings.disable_features.reactions = false; // Keep reactions
    window.lampa_settings.disable_features.discuss = true;
    window.lampa_settings.disable_features.ai = true;
    window.lampa_settings.disable_features.persons = true;
    window.lampa_settings.disable_features.trailers = true;
    window.lampa_settings.disable_features.feed = true;
    window.lampa_settings.disable_features.ads = true;
    window.lampa_settings.disable_features.modss_online = false;

    // Developer settings - disable ads
    window.lampa_settings.developer = window.lampa_settings.developer || {};
    window.lampa_settings.developer.ads = false;
    window.lampa_settings.developer.enabled = false;
    window.lampa_settings.developer.socket_methods = false;
    window.lampa_settings.developer.nodemo = false;
    window.lampa_settings.developer.fps = false;

    // Force TV platform for better compatibility
    if (window.Lampa?.Platform?.tv) {
        Lampa.Platform.tv();
    }

    // ==================== CSS INJECTION ====================
    function injectAdBlockCSS() {
        const css = `
            /* Hide ad-related elements */
            .ad-server,
            .ad-container,
            .ad-banner,
            .premium-banner,
            .cub-premium,
            .button--subscribe,
            .button--book,
            .notice--icon,
            .icon--blink,
            .open--broadcast,
            .black-friday__button,
            .womens_day__button,
            .christmas__button,
            [data-action="timetable"],
            .selectbox-item--icon.cub-icon,
            .settings-param--cub,
            [data-name="terminal"],
            [data-name="export"] {
                display: none !important;
            }
            
            /* Hide CUB Premium related text */
            .selector-cub,
            .premium-text,
            div:has(> span:contains("CUB Premium")) {
                display: none !important;
            }
        `;

        const style = document.createElement('style');
        style.id = 'lampa-clean-adblock';
        style.textContent = css;
        document.head.appendChild(style);
    }

    // ==================== AD REMOVAL FUNCTIONS ====================
    function removeAds() {
        // Remove ad server elements
        const adSelectors = [
            '.ad-server',
            '.ad-container',
            '.premium-banner',
            '.button--subscribe',
            '.button--book',
            '.notice--icon',
            '.open--broadcast',
            '.black-friday__button',
            '.womens_day__button',
            '.christmas__button',
            '[data-action="timetable"]'
        ];

        adSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => el.remove());
        });
    }

    function removeSettingsAds() {
        // Remove CUB Premium items from settings
        const cubSelectors = [
            '[data-name="card_quality"]',
            '[data-name="terminal"]',
            '[data-name="export"]',
            '[data-name="card_interfice_reactions"]'
        ];

        cubSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => el.remove());
        });

        // Remove "CUB Premium" text items
        document.querySelectorAll('.settings-param').forEach(el => {
            if (el.textContent.includes('CUB Premium') ||
                el.textContent.includes('CUB Premi')) {
                el.remove();
            }
        });
    }

    // ==================== VIDEO AD BLOCKING ====================
    function blockVideoAds() {
        // Override the ad display function if it exists
        if (window.Lampa?.Ad) {
            window.Lampa.Ad = {
                show: function () { return Promise.resolve(); },
                load: function () { return Promise.resolve(); },
                isReady: function () { return false; },
                destroy: function () { }
            };
        }

        // Block common ad video sources
        const originalFetch = window.fetch;
        window.fetch = function (url, options) {
            if (typeof url === 'string') {
                // Block known ad domains
                const adDomains = [
                    'googleads',
                    'doubleclick',
                    'googlesyndication',
                    'adservice',
                    'pagead',
                    'ads.google',
                    'yandex.ru/ads',
                    'mc.yandex',
                    'an.yandex'
                ];

                const isAd = adDomains.some(domain => url.includes(domain));
                if (isAd) {
                    console.log('[Lampa Clean AdBlock] Blocked ad request:', url);
                    return Promise.reject(new Error('Blocked by AdBlock'));
                }
            }
            return originalFetch.call(this, url, options);
        };
    }

    // ==================== PREROLL AD BLOCKING ====================
    function blockPrerollAds() {
        // Monitor for ad overlay elements
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === 'childList') {
                    // Check for ad-related elements
                    mutation.addedNodes.forEach(function (node) {
                        if (node.nodeType === 1) {
                            // Check for "Реклама" text
                            if (node.textContent && node.textContent.includes('Реклама')) {
                                console.log('[Lampa Clean AdBlock] Removing ad element');
                                node.remove();
                            }

                            // Check for ad classes
                            if (node.classList && (
                                node.classList.contains('ad-server') ||
                                node.classList.contains('ad-container') ||
                                node.classList.contains('preroll')
                            )) {
                                node.remove();
                            }
                        }
                    });
                }
            });

            // Periodic cleanup
            removeAds();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ==================== EVENT LISTENERS ====================
    function setupEventListeners() {
        if (!window.Lampa?.Listener) {
            setTimeout(setupEventListeners, 100);
            return;
        }

        // On settings open - remove CUB items
        Lampa.Settings?.listener?.follow('open', function (event) {
            setTimeout(removeSettingsAds, 50);

            if (event.name === 'server') {
                // Remove ad-server from server settings
                document.querySelector('.ad-server')?.remove();
            }
        });

        // On activity change
        Lampa.Controller?.listener?.follow('toggle', function (event) {
            if (event.name === 'full') {
                setTimeout(removeAds, 20);
            }
        });

        // On app events
        Lampa.Listener?.follow('app', function (event) {
            if (event.type === 'ready') {
                removeAds();
                removeSettingsAds();
            }

            if (event.type === 'complite' || event.type === 'complete') {
                setTimeout(removeAds, 100);
            }
        });

        // On activity events
        Lampa.Listener?.follow('activity', function (event) {
            if (event.type === 'complite' || event.type === 'complete') {
                setTimeout(removeAds, 100);

                // Remove book/subscribe buttons
                document.querySelector('.button--book')?.remove();
                document.querySelector('.button--subscribe')?.remove();
            }
        });
    }

    // ==================== INITIALIZATION ====================
    function init() {
        injectAdBlockCSS();
        blockVideoAds();
        blockPrerollAds();

        if (window.Lampa) {
            setupEventListeners();
            removeAds();
        } else {
            // Wait for Lampa to load
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function () {
                    setTimeout(function () {
                        setupEventListeners();
                        removeAds();
                    }, 500);
                });
            } else {
                setTimeout(function () {
                    setupEventListeners();
                    removeAds();
                }, 500);
            }
        }

        console.log('[Lampa Clean AdBlock] Initialized successfully');
    }

    init();

})();
