/**
 * Lampa Clean Mirror - Uncensored Version
 * Modified to remove plugin blacklist and verification
 * 
 * This is a minimal Lampa loader that bypasses all plugin restrictions
 */

(function () {
  'use strict';

  console.log('[Lampa Clean] Loading uncensored Lampa...');

  // Initialize Lampa namespace
  window.Lampa = window.Lampa || {};

  // Disable any plugin verification
  if (window.Lampa.Plugins) {
    window.Lampa.Plugins.checkBlacklist = function () { return false; };
    window.Lampa.Plugins.verifySignature = function () { return true; };
  }

  // Load Lampa core
  const script = document.createElement('script');
  script.src = 'https://yumata.github.io/lampa/app.js';
  script.onload = function () {
    console.log('[Lampa Clean] Lampa core loaded');

    // Patch Lampa after it loads
    if (window.Lampa && window.Lampa.Plugins) {
      const originalAdd = window.Lampa.Plugins.add;

      window.Lampa.Plugins.add = function (plugin) {
        console.log('[Lampa Clean] Installing plugin (uncensored):', plugin);

        // Remove verification
        if (originalAdd) {
          try {
            return originalAdd.call(this, plugin);
          } catch (e) {
            console.warn('[Lampa Clean] Bypassing error:', e);
          }
        }

        // Direct load
        if (plugin && plugin.url) {
          const s = document.createElement('script');
          s.src = plugin.url;
          document.head.appendChild(s);
        }
      };

      // Disable blacklist
      if (window.Lampa.Plugins.checkBlacklist) {
        window.Lampa.Plugins.checkBlacklist = function () { return false; };
      }

      // Disable signature check
      if (window.Lampa.Plugins.verifySignature) {
        window.Lampa.Plugins.verifySignature = function () { return true; };
      }

      console.log('[Lampa Clean] Plugin verification disabled');
    }
  };

  document.head.appendChild(script);

})();
