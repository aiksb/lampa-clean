/**
 * Lampa Clean - Ad Blocker v1.3
 * Provider: aiksb (github.com/aiksb/lampa-clean)
 * 
 * Clean ad blocking without domain locks.
 * Combines multiple ad blocking techniques:
 * - Settings overrides
 * - CSS injection
 * - Player hook to skip preroll
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

    console.log('[aiksb-adblock v1.3] Initializing...');

    // ==================== LAMPA SETTINGS OVERRIDES ====================
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
    window.lampa_settings.disable_features.reactions = false;
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

    // ==================== PREMIUM STATUS SPOOF ====================
    function spoofPremium() {
        try {
            window.Account = window.Account || {};
            Object.defineProperty(window.Account, 'hasPremium', {
                value: function () { return true; },
                writable: true,
                configurable: true
            });
        } catch (e) { }

        try {
            if (window.Lampa?.Account) {
                Object.defineProperty(window.Lampa.Account, 'hasPremium', {
                    value: function () { return true; },
                    writable: true,
                    configurable: true
                });
            }
        } catch (e) { }
    }

    spoofPremium();

    // ==================== VIDEO MUTING (BLOCKS AD AUDIO) ====================
    // Intercept all video elements to prevent ad audio from playing
    var adVideoPatterns = ['preroll', 'ad-', '_ad', 'advertisement', 'promo'];

    function isAdVideo(src) {
        if (!src) return false;
        src = src.toLowerCase();
        return adVideoPatterns.some(function (p) { return src.includes(p); });
    }

    // Mute any video that looks like an ad
    function muteAdVideos() {
        document.querySelectorAll('video').forEach(function (v) {
            if (isAdVideo(v.src) || isAdVideo(v.currentSrc)) {
                v.muted = true;
                v.volume = 0;
                v.pause();
                console.log('[aiksb-adblock] Muted ad video:', v.src);
            }
        });
    }

    // Override HTMLVideoElement.prototype.play to catch ads
    if (!window._aiksbVideoPatched) {
        window._aiksbVideoPatched = true;
        var originalPlay = HTMLVideoElement.prototype.play;

        HTMLVideoElement.prototype.play = function () {
            var video = this;
            var src = video.src || video.currentSrc || '';

            // Check if this is an ad video
            if (isAdVideo(src)) {
                console.log('[aiksb-adblock] Blocking ad video play:', src);
                video.muted = true;
                video.volume = 0;
                // Dispatch ended event to skip ad
                setTimeout(function () {
                    video.dispatchEvent(new Event('ended'));
                }, 10);
                return Promise.resolve();
            }

            return originalPlay.call(this);
        };
    }

    // Also listen for new video elements
    if (!window._aiksbVideoObserver) {
        window._aiksbVideoObserver = new MutationObserver(function (mutations) {
            mutations.forEach(function (m) {
                m.addedNodes.forEach(function (node) {
                    if (node.nodeName === 'VIDEO') {
                        var v = node;
                        if (isAdVideo(v.src)) {
                            v.muted = true;
                            v.volume = 0;
                        }
                    }
                    // Check children
                    if (node.querySelectorAll) {
                        node.querySelectorAll('video').forEach(function (v) {
                            if (isAdVideo(v.src)) {
                                v.muted = true;
                                v.volume = 0;
                            }
                        });
                    }
                });
            });
        });

        if (document.body) {
            window._aiksbVideoObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    // ==================== PLAYER AD HOOK (MAIN FIX) ====================
    // This directly hooks into Lampa's ad system to skip preroll instantly
    function hookPlayerAds() {
        if (!window.Lampa) {
            setTimeout(hookPlayerAds, 100);
            return;
        }

        // Method 1: Override Lampa.Ad completely
        try {
            if (Lampa.Ad) {
                Lampa.Ad = {
                    show: function (params) {
                        console.log('[aiksb-adblock] Skipping ad, starting video directly');
                        if (params && params.onComplete) {
                            params.onComplete();
                        }
                        return Promise.resolve();
                    },
                    load: function () { return Promise.resolve(); },
                    isReady: function () { return false; },
                    destroy: function () { }
                };
            }
        } catch (e) { }

        // Method 2: Hook into player listener to skip ads
        try {
            Lampa.Listener.follow('player', function (e) {
                if (e.type === 'start') {
                    // Remove any ad overlays immediately
                    var adOverlay = document.querySelector('.player-video__ad');
                    if (adOverlay) {
                        adOverlay.remove();
                        console.log('[aiksb-adblock] Removed ad overlay from player');
                    }
                }
            });
        } catch (e) { }

        // Method 3: Override ad callback in PlayerVideo if exists
        try {
            if (Lampa.PlayerVideo) {
                var originalCreate = Lampa.PlayerVideo.create;
                if (originalCreate) {
                    Lampa.PlayerVideo.create = function () {
                        var result = originalCreate.apply(this, arguments);
                        // Skip any ad initialization
                        if (result && result.ad) {
                            result.ad = {
                                show: function () { },
                                destroy: function () { }
                            };
                        }
                        return result;
                    };
                }
            }
        } catch (e) { }

        // Method 4: Intercept video stream requests
        try {
            Lampa.Listener.follow('full', function (e) {
                if (e.type === 'complite') {
                    // Ensure no ad elements are present when entering fullscreen
                    setTimeout(function () {
                        var ads = document.querySelectorAll('.ad-server, .ad-container, .player-video__ad, .preroll');
                        ads.forEach(function (ad) { ad.remove(); });
                    }, 50);
                }
            });
        } catch (e) { }
    }

    // ==================== CSS INJECTION ====================
    function injectAdBlockCSS() {
        if (document.getElementById('aiksb-adblock-css')) return;

        var css = `
            /* Hide ad elements */
            .ad-server, .ad-container, .ad-banner, .premium-banner, .cub-premium,
            .button--subscribe, .button--book, .notice--icon, .icon--blink,
            .open--broadcast, .black-friday__button, .womens_day__button,
            .christmas__button, [data-action="timetable"], .selectbox-item--icon.cub-icon,
            .settings-param--cub, [data-name="terminal"], [data-name="export"],
            .selector-cub, .premium-text, .player-video__ad, .preroll {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
            }
        `;

        var style = document.createElement('style');
        style.id = 'aiksb-adblock-css';
        style.textContent = css;

        if (document.head) {
            document.head.appendChild(style);
        }
    }

    // ==================== AD REMOVAL ====================
    function removeAds() {
        var selectors = [
            '.ad-server', '.ad-container', '.premium-banner',
            '.button--subscribe', '.button--book', '.notice--icon',
            '.open--broadcast', '.black-friday__button', '.womens_day__button',
            '.christmas__button', '[data-action="timetable"]',
            '.player-video__ad', '.preroll'
        ];

        selectors.forEach(function (sel) {
            try {
                document.querySelectorAll(sel).forEach(function (el) { el.remove(); });
            } catch (e) { }
        });
    }

    function removeSettingsAds() {
        var selectors = [
            '[data-name="card_quality"]', '[data-name="terminal"]',
            '[data-name="export"]', '[data-name="card_interfice_reactions"]'
        ];

        selectors.forEach(function (sel) {
            try {
                document.querySelectorAll(sel).forEach(function (el) { el.remove(); });
            } catch (e) { }
        });

        try {
            document.querySelectorAll('.settings-param').forEach(function (el) {
                if (el.textContent && el.textContent.includes('CUB Premium')) {
                    el.remove();
                }
            });
        } catch (e) { }
    }

    // ==================== DOM OBSERVER ====================
    var observer = null;

    function startObserver() {
        if (observer || !document.body) {
            if (!document.body) setTimeout(startObserver, 100);
            return;
        }

        observer = new MutationObserver(function (mutations) {
            var needsCleanup = false;

            mutations.forEach(function (m) {
                if (m.addedNodes.length) {
                    m.addedNodes.forEach(function (node) {
                        if (node.nodeType === 1) {
                            if (node.classList && (
                                node.classList.contains('ad-server') ||
                                node.classList.contains('ad-container') ||
                                node.classList.contains('preroll') ||
                                node.classList.contains('player-video__ad')
                            )) {
                                node.remove();
                                needsCleanup = true;
                                console.log('[aiksb-adblock] Removed ad element');
                            }
                        }
                    });
                }
            });

            if (needsCleanup) removeAds();
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // ==================== EVENT LISTENERS ====================
    function setupListeners() {
        if (!window.Lampa?.Listener) {
            setTimeout(setupListeners, 200);
            return;
        }

        spoofPremium();

        try {
            Lampa.Settings?.listener?.follow('open', function () {
                setTimeout(removeSettingsAds, 50);
            });
        } catch (e) { }

        try {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') {
                    removeAds();
                    removeSettingsAds();
                    spoofPremium();
                }
            });
        } catch (e) { }

        try {
            Lampa.Listener.follow('activity', function (e) {
                if (e.type === 'complite' || e.type === 'complete') {
                    setTimeout(removeAds, 50);
                }
            });
        } catch (e) { }

        // Hook player specifically
        try {
            Lampa.Listener.follow('player', function (e) {
                if (e.type === 'start' || e.type === 'play') {
                    // Immediately remove any ad overlays
                    removeAds();
                }
            });
        } catch (e) { }
    }

    // ==================== INIT ====================
    function init() {
        injectAdBlockCSS();
        hookPlayerAds();
        startObserver();

        if (window.Lampa) {
            setupListeners();
            removeAds();
        } else {
            var check = function () {
                if (window.Lampa) {
                    setupListeners();
                    removeAds();
                    hookPlayerAds();
                } else {
                    setTimeout(check, 200);
                }
            };
            setTimeout(check, 200);
        }

        console.log('[aiksb-adblock v1.3] Ready - provider: aiksb');
    }

    init();

})();
