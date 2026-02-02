/**
 * Lampa Clean - Ad Blocker v1.1
 * Provider: Lampa Clean (github.com/aiksb/lampa-clean)
 * 
 * Clean ad blocking without domain locks.
 * Combines multiple ad blocking techniques:
 * - Settings overrides
 * - CSS injection
 * - Fetch interception  
 * - Premium status spoof
 * - Video element proxy
 * - Timer clearing
 * 
 * Blocks:
 * - Pre-roll ads before movies
 * - CUB Premium nags
 * - Various promotional banners
 * - Subscription buttons
 */

(function () {
    'use strict';

    console.log('[Lampa Clean AdBlock v1.1] Initializing...');

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

    // ==================== PREMIUM STATUS SPOOF ====================
    // Fallback method from ads.js - spoof premium account status
    window.Account = window.Account || {};
    window.Account.hasPremium = () => true;

    // Also spoof Lampa.Account if exists
    if (window.Lampa?.Account) {
        window.Lampa.Account.hasPremium = () => true;
    }

    // ==================== VIDEO ELEMENT PROXY ====================
    // Fallback method from ads.js - intercept video creation for ads
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = new Proxy(originalCreateElement, {
        apply(target, thisArg, args) {
            const element = target.apply(thisArg, args);

            if (args[0] === 'video') {
                // Flag to track if this is an ad video
                let isAdVideo = false;

                // Override play to detect and block ad videos
                const originalPlay = element.play.bind(element);
                element.play = function () {
                    // Check if this might be an ad video by looking at src
                    const src = element.src || element.currentSrc || '';
                    if (src.includes('ad') || src.includes('preroll') || src.includes('commercial')) {
                        console.log('[Lampa Clean AdBlock] Blocking ad video play:', src);
                        isAdVideo = true;

                        // Simulate video end to skip ad
                        setTimeout(() => {
                            element.dispatchEvent(new Event('ended'));
                        }, 100);

                        return Promise.resolve();
                    }

                    return originalPlay();
                };
            }

            return element;
        }
    });

    // ==================== AD TIMER CLEARING ====================
    // Fallback method from ads.js - clear ad-related timers
    function clearAdTimers() {
        console.log('[Lampa Clean AdBlock] Clearing potential ad timers...');
        const highestId = setTimeout(() => { }, 0);
        // Only clear a reasonable range to avoid breaking app functionality
        const startId = Math.max(0, highestId - 50);
        for (let i = startId; i <= highestId; i++) {
            clearTimeout(i);
        }
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

        // Clear potential ad timers on load
        setTimeout(clearAdTimers, 1000);

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
                        clearAdTimers();
                    }, 500);
                });
            } else {
                setTimeout(function () {
                    setupEventListeners();
                    removeAds();
                    clearAdTimers();
                }, 500);
            }
        }

        console.log('[Lampa Clean AdBlock v1.1] Initialized - Provider: Lampa Clean');
    }

    init();

})();
