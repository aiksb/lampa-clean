/**
 * Lampa Clean - Ad Blocker v1.2
 * Provider: Lampa Clean (github.com/aiksb/lampa-clean)
 * 
 * Clean ad blocking without domain locks.
 * Combines multiple ad blocking techniques:
 * - Settings overrides
 * - CSS injection
 * - Fetch interception  
 * - Premium status spoof
 * - DOM observer for ad removal
 * 
 * Blocks:
 * - Pre-roll ads before movies
 * - CUB Premium nags
 * - Various promotional banners
 * - Subscription buttons
 */

(function () {
    'use strict';

    console.log('[Lampa Clean AdBlock v1.2] Initializing...');

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
    try {
        if (window.Lampa?.Platform?.tv) {
            Lampa.Platform.tv();
        }
    } catch (e) {
        // Platform API might not be available yet
    }

    // ==================== PREMIUM STATUS SPOOF ====================
    // Spoof premium account status (wrapped in try-catch for read-only props)
    function spoofPremium() {
        try {
            window.Account = window.Account || {};
            if (!Object.getOwnPropertyDescriptor(window.Account, 'hasPremium')?.configurable === false) {
                Object.defineProperty(window.Account, 'hasPremium', {
                    value: function () { return true; },
                    writable: true,
                    configurable: true
                });
            }
        } catch (e) {
            // Property already defined and not configurable
        }

        // Also spoof Lampa.Account if exists
        try {
            if (window.Lampa?.Account) {
                const descriptor = Object.getOwnPropertyDescriptor(window.Lampa.Account, 'hasPremium');
                if (!descriptor || descriptor.configurable !== false) {
                    Object.defineProperty(window.Lampa.Account, 'hasPremium', {
                        value: function () { return true; },
                        writable: true,
                        configurable: true
                    });
                }
            }
        } catch (e) {
            // Property protected
        }
    }

    spoofPremium();

    // ==================== CSS INJECTION ====================
    function injectAdBlockCSS() {
        // Check if already injected
        if (document.getElementById('lampa-clean-adblock')) return;

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
            
            /* Hide CUB Premium related elements */
            .selector-cub,
            .premium-text {
                display: none !important;
            }
        `;

        const style = document.createElement('style');
        style.id = 'lampa-clean-adblock';
        style.textContent = css;

        if (document.head) {
            document.head.appendChild(style);
        } else {
            // Wait for head to be available
            document.addEventListener('DOMContentLoaded', function () {
                document.head.appendChild(style);
            });
        }
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

        adSelectors.forEach(function (selector) {
            try {
                document.querySelectorAll(selector).forEach(function (el) {
                    el.remove();
                });
            } catch (e) {
                // Selector might be invalid in some environments
            }
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

        cubSelectors.forEach(function (selector) {
            try {
                document.querySelectorAll(selector).forEach(function (el) {
                    el.remove();
                });
            } catch (e) {
                // Ignore
            }
        });

        // Remove "CUB Premium" text items
        try {
            document.querySelectorAll('.settings-param').forEach(function (el) {
                if (el.textContent &&
                    (el.textContent.includes('CUB Premium') ||
                        el.textContent.includes('CUB Premi'))) {
                    el.remove();
                }
            });
        } catch (e) {
            // Ignore
        }
    }

    // ==================== VIDEO AD BLOCKING ====================
    function blockVideoAds() {
        // Override the ad display function if it exists
        try {
            if (window.Lampa?.Ad) {
                window.Lampa.Ad = {
                    show: function () { return Promise.resolve(); },
                    load: function () { return Promise.resolve(); },
                    isReady: function () { return false; },
                    destroy: function () { }
                };
            }
        } catch (e) {
            // Lampa.Ad might be protected
        }

        // Block common ad video sources via fetch
        if (typeof window.fetch === 'function' && !window._adblockFetchPatched) {
            window._adblockFetchPatched = true;
            const originalFetch = window.fetch;

            window.fetch = function (url, options) {
                if (typeof url === 'string') {
                    // Block known ad domains (use exact domain matching to avoid false positives)
                    const adDomains = [
                        'googleads.g.doubleclick.net',
                        'pagead2.googlesyndication.com',
                        'adservice.google.com',
                        'www.googleadservices.com',
                        'an.yandex.ru',
                        'mc.yandex.ru',
                        'yandex.ru/ads'
                    ];

                    const isAd = adDomains.some(function (domain) {
                        return url.includes(domain);
                    });

                    if (isAd) {
                        console.log('[Lampa Clean AdBlock] Blocked ad request:', url);
                        return Promise.reject(new Error('Blocked by AdBlock'));
                    }
                }
                return originalFetch.call(this, url, options);
            };
        }
    }

    // ==================== PREROLL AD BLOCKING ====================
    var adObserver = null;

    function blockPrerollAds() {
        // Only observe once
        if (adObserver) return;

        // Wait for body to be available
        if (!document.body) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', blockPrerollAds);
            } else {
                setTimeout(blockPrerollAds, 100);
            }
            return;
        }

        // Monitor for ad overlay elements
        adObserver = new MutationObserver(function (mutations) {
            var shouldClean = false;

            mutations.forEach(function (mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function (node) {
                        if (node.nodeType === 1) {
                            // Check for ad classes
                            if (node.classList && (
                                node.classList.contains('ad-server') ||
                                node.classList.contains('ad-container') ||
                                node.classList.contains('preroll')
                            )) {
                                node.remove();
                                shouldClean = true;
                            }

                            // Check for "Реклама" text in specific ad containers
                            if (node.className && typeof node.className === 'string' &&
                                node.className.includes('ad-')) {
                                if (node.textContent && node.textContent.includes('Реклама')) {
                                    node.remove();
                                    shouldClean = true;
                                }
                            }
                        }
                    });
                }
            });

            // Run cleanup if ads were detected
            if (shouldClean) {
                removeAds();
            }
        });

        adObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ==================== EVENT LISTENERS ====================
    function setupEventListeners() {
        if (!window.Lampa?.Listener) {
            setTimeout(setupEventListeners, 200);
            return;
        }

        // Re-run premium spoof after Lampa is ready
        spoofPremium();

        // On settings open - remove CUB items
        try {
            if (Lampa.Settings?.listener) {
                Lampa.Settings.listener.follow('open', function (event) {
                    setTimeout(removeSettingsAds, 50);

                    if (event && event.name === 'server') {
                        var adServer = document.querySelector('.ad-server');
                        if (adServer) adServer.remove();
                    }
                });
            }
        } catch (e) {
            // Settings listener not available
        }

        // On activity change
        try {
            if (Lampa.Controller?.listener) {
                Lampa.Controller.listener.follow('toggle', function (event) {
                    if (event && event.name === 'full') {
                        setTimeout(removeAds, 20);
                    }
                });
            }
        } catch (e) {
            // Controller listener not available
        }

        // On app events
        try {
            Lampa.Listener.follow('app', function (event) {
                if (event.type === 'ready') {
                    removeAds();
                    removeSettingsAds();
                    spoofPremium();
                }

                if (event.type === 'complite' || event.type === 'complete') {
                    setTimeout(removeAds, 100);
                }
            });
        } catch (e) {
            // Listener not available
        }

        // On activity events
        try {
            Lampa.Listener.follow('activity', function (event) {
                if (event.type === 'complite' || event.type === 'complete') {
                    setTimeout(removeAds, 100);

                    // Remove book/subscribe buttons
                    var bookBtn = document.querySelector('.button--book');
                    var subBtn = document.querySelector('.button--subscribe');
                    if (bookBtn) bookBtn.remove();
                    if (subBtn) subBtn.remove();
                }
            });
        } catch (e) {
            // Listener not available
        }
    }

    // ==================== INITIALIZATION ====================
    function init() {
        // Inject CSS first (low risk)
        injectAdBlockCSS();

        // Block video ads
        blockVideoAds();

        // Start DOM observer
        blockPrerollAds();

        if (window.Lampa) {
            setupEventListeners();
            removeAds();
        } else {
            // Wait for Lampa to load
            var checkLampa = function () {
                if (window.Lampa) {
                    setupEventListeners();
                    removeAds();
                } else {
                    setTimeout(checkLampa, 300);
                }
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function () {
                    setTimeout(checkLampa, 300);
                });
            } else {
                setTimeout(checkLampa, 300);
            }
        }

        console.log('[Lampa Clean AdBlock v1.2] Initialized - Provider: Lampa Clean');
    }

    // Start initialization
    init();

})();
