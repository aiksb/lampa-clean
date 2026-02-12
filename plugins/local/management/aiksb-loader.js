/**
 * Lampa Clean - Plugin System v2.2.8
 * 
 * Fixed: syntax error (missing header tag), u.replace fix (v2.2.7), version 2.2.8
 */

(function () {
    'use strict';

    if (window.__LAMPA_CLEAN_INIT__) {
        console.log('[Lampa Clean] System already running, skipping duplicate load.');
        return;
    }

    // ==================== CONFIGURATION ====================
    const CONFIG = {
        PLUGIN_DB_URL: './plugins.json',
        STORAGE_KEY: 'lampa_clean_plugins',
        SOURCE_KEY: 'lampa_clean_source',
        PLUGIN_TIMEOUT: 15000,
        LOCAL_PLUGINS_BASE: './plugins/local/',
        CORS_PROXIES: [
            'https://corsproxy.io/?',
            'https://api.allorigins.win/raw?url='
        ],
        CURRENT_PROXY_INDEX: 0
    };

    // ==================== STATE ====================
    let pluginDatabase = null;
    let installedPlugins = [];
    let isInitialized = false;
    const loadingMap = new Map();

    // ==================== INITIALIZATION ====================
    async function init() {
        if (isInitialized || window.__LAMPA_CLEAN_INIT__) return;
        window.__LAMPA_CLEAN_INIT__ = true;

        console.log('[Lampa Clean] Initializing plugin system v2.2.7...');

        try {
            cleanupNativeStorage(); // Force string format
            await loadPluginDatabase();
            loadInstalledPlugins();
            await autoLoadPlugins();
            await loadUserPlugins();
            registerSettingsComponent();

            isInitialized = true;
            console.log('[Lampa Clean] Plugin system initialized');
        } catch (error) {
            console.error('[Lampa Clean] Init failed:', error);
            window.__LAMPA_CLEAN_INIT__ = false;
        }
    }

    // ==================== CLEANUP ====================
    function cleanupNativeStorage() {
        try {
            let plugins = Lampa.Storage.get('plugins') || [];
            if (!Array.isArray(plugins)) {
                if (typeof plugins === 'string') plugins = plugins.split(',').filter(p => p.trim());
                else plugins = [];
            }

            // Critical fix: convert objects to strings to avoid 'u.replace is not a function'
            const cleaned = plugins.map(item => {
                if (!item) return null;
                if (typeof item === 'string') return item.length > 5 ? item : null;
                if (typeof item === 'object' && item.url) return item.url;
                return null;
            }).filter(Boolean);

            Lampa.Storage.set('plugins', cleaned);
        } catch (e) { }
    }
    // ==================== DATABASE ====================
    async function loadPluginDatabase() {
        try {
            const response = await fetch(CONFIG.PLUGIN_DB_URL + '?v=' + Date.now());
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            pluginDatabase = await response.json();
            console.log('[Lampa Clean] Database loaded:', pluginDatabase.version);
        } catch (error) {
            console.error('[Lampa Clean] Database load failed:', error);
            pluginDatabase = { groups: [], profiles: [] };
        }
    }

    function loadInstalledPlugins() {
        try {
            const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
            installedPlugins = stored ? JSON.parse(stored) : [];
        } catch (e) {
            installedPlugins = [];
        }
    }

    function saveInstalledPlugins() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(installedPlugins));
        } catch (e) {
            console.error('[Lampa Clean] Save failed:', e);
        }
    }

    // ==================== SOURCE MANAGEMENT ====================
    function getPluginSource() {
        try {
            return localStorage.getItem(CONFIG.SOURCE_KEY) || 'original';
        } catch (e) {
            return 'original';
        }
    }

    function setPluginSource(source) {
        try {
            localStorage.setItem(CONFIG.SOURCE_KEY, source);
        } catch (e) { }
    }

    // ==================== URL HANDLING ====================
    function fixUrl(url) {
        const source = getPluginSource();
        let finalUrl = url;

        if (source === 'local') {
            let filename = url.split('/').pop().split('?')[0];
            if (!filename) {
                const parts = url.split('/').filter(p => p);
                filename = parts[parts.length - 1] + '.js';
            }
            finalUrl = CONFIG.LOCAL_PLUGINS_BASE + filename;
        }

        if (window.location.protocol === 'https:' && finalUrl.startsWith('http://')) {
            const proxy = CONFIG.CORS_PROXIES[CONFIG.CURRENT_PROXY_INDEX];
            finalUrl = proxy + encodeURIComponent(finalUrl);
        }

        return finalUrl;
    }

    // ==================== PLUGIN LOADING ====================
    async function loadPlugin(url, name, showProgress = true) {
        if (loadingMap.has(url)) return loadingMap.get(url);

        const promise = new Promise((resolve, reject) => {
            const fixedUrl = fixUrl(url);
            const cacheUrl = fixedUrl + (fixedUrl.includes('?') ? '&' : '?') + 'v=' + Date.now();

            let progressEl = showProgress ? showInstallProgress(name, 0) : null;

            const script = document.createElement('script');
            script.src = cacheUrl;
            script.async = true;

            let progress = 0;
            const progressInterval = setInterval(() => {
                progress = Math.min(progress + 15, 90);
                if (progressEl) updateProgress(progressEl, progress);
            }, 150);

            const timeout = setTimeout(() => {
                clearInterval(progressInterval);
                script.remove();
                if (progressEl) removeProgress(progressEl);
                reject(new Error('Timeout'));
            }, CONFIG.PLUGIN_TIMEOUT);

            script.onload = () => {
                clearTimeout(timeout);
                clearInterval(progressInterval);
                if (progressEl) {
                    updateProgress(progressEl, 100);
                    setTimeout(() => removeProgress(progressEl), 400);
                }
                console.log('[Lampa Clean] Loaded:', name);
                resolve();
            };

            script.onerror = () => {
                clearTimeout(timeout);
                clearInterval(progressInterval);
                script.remove();
                if (progressEl) removeProgress(progressEl);
                reject(new Error('Load failed'));
            };

            document.head.appendChild(script);
        });

        loadingMap.set(url, promise);
        try {
            return await promise;
        } finally {
            loadingMap.delete(url);
        }
    }

    // ==================== PROGRESS UI ====================
    function showInstallProgress(name, percent) {
        const el = document.createElement('div');
        el.className = 'lampa-clean-progress';
        el.innerHTML = `
            <div style="font-size:13px;margin-bottom:6px">${name}</div>
            <div style="height:4px;background:#333;border-radius:2px;overflow:hidden">
                <div class="fill" style="height:100%;width:${percent}%;background:linear-gradient(90deg,#667eea,#764ba2);transition:width 0.15s"></div>
            </div>
            <div class="pct" style="font-size:11px;color:#888;text-align:right;margin-top:3px">${percent}%</div>
        `;
        el.style.cssText = 'position:fixed;bottom:80px;right:20px;background:rgba(0,0,0,0.9);border:1px solid #444;border-radius:8px;padding:12px 16px;min-width:180px;z-index:10000;color:#fff;font-family:Arial,sans-serif';
        document.body.appendChild(el);
        return el;
    }

    function updateProgress(el, percent) {
        if (!el) return;
        const fill = el.querySelector('.fill');
        const pct = el.querySelector('.pct');
        if (fill) fill.style.width = percent + '%';
        if (pct) pct.textContent = percent + '%';
    }

    function removeProgress(el) {
        if (el && el.parentNode) {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.3s';
            setTimeout(() => el.remove(), 300);
        }
    }

    // ==================== INSTALLATION ====================
    function isPluginInstalled(plugin) {
        if (!plugin) return false;

        // Check our own list
        const inOurList = installedPlugins.some(p =>
            p && (p.url === plugin.url || (p.name && plugin.name && p.name === plugin.name))
        );
        if (inOurList) return true;

        // Check Lampa's native list if available
        try {
            const nativePlugins = Lampa.Storage.get('plugins') || [];
            if (Array.isArray(nativePlugins)) {
                return nativePlugins.some(p => {
                    if (!p) return false;
                    const url = typeof p === 'string' ? p : p.url;
                    return url === plugin.url;
                });
            }
        } catch (e) { }

        return false;
    }

    async function installPlugin(plugin) {
        if (isPluginInstalled(plugin)) {
            notify(plugin.name + ' already installed');
            return true;
        }

        try {
            await loadPlugin(plugin.url, plugin.name, true);

            installedPlugins.push({
                name: plugin.name,
                url: plugin.url,
                installed_at: new Date().toISOString()
            });
            saveInstalledPlugins();
            syncWithLampa(plugin.url, 'add');

            notify('SUCCESS: ' + plugin.name + ' installed');
            return true;
        } catch (error) {
            console.error('[Lampa Clean] Install failed:', plugin.url, error);

            let errorMsg = 'Load error';
            if (error.message === 'Timeout') {
                errorMsg = 'Timeout - server not responding';
            } else if (error.message === 'Load failed') {
                errorMsg = 'Server unreachable or blocked';
            }

            notify('FAILED: ' + plugin.name + ': ' + errorMsg);
            return false;
        }
    }

    async function installProfile(profile) {
        notify('Installing profile: ' + profile.name);

        let success = 0;
        for (const pluginName of profile.plugins) {
            const plugin = findPluginByName(pluginName);
            if (plugin && !isPluginInstalled(plugin)) {
                try {
                    await loadPlugin(plugin.url, plugin.name, false);
                    installedPlugins.push({
                        name: plugin.name,
                        url: plugin.url,
                        installed_at: new Date().toISOString()
                    });
                    success++;
                } catch (e) { }
            }
        }

        saveInstalledPlugins();
        notify('Installed: ' + success + ' of ' + profile.plugins.length);
    }

    function findPluginByName(name) {
        if (!pluginDatabase?.groups) return null;
        for (const group of pluginDatabase.groups) {
            const plugin = group.plugins?.find(p => p.name === name);
            if (plugin) return plugin;
        }
        return null;
    }

    function uninstallPlugin(plugin) {
        installedPlugins = installedPlugins.filter(p => p.url !== plugin.url);
        saveInstalledPlugins();
        syncWithLampa(plugin.url, 'remove');
        notify('SUCCESS: ' + plugin.name + ' removed');
    }

    function syncWithLampa(url, action) {
        try {
            let nativePlugins = Lampa.Storage.get('plugins') || [];
            if (typeof nativePlugins === 'string') {
                nativePlugins = nativePlugins.split(',').filter(p => p.trim());
            }

            if (action === 'add') {
                const alreadyHas = nativePlugins.some(p => {
                    if (!p) return false;
                    const pUrl = typeof p === 'string' ? p : p.url;
                    return pUrl === url;
                });

                if (!alreadyHas) {
                    nativePlugins.push(url); // Force string format for compatibility
                }
            } else if (action === 'remove') {
                nativePlugins = nativePlugins.filter(p => {
                    if (!p) return false;
                    const pUrl = typeof p === 'string' ? p : p.url;
                    return pUrl !== url;
                });
            }

            Lampa.Storage.set('plugins', nativePlugins);
        } catch (e) {
            console.error('[Lampa Clean] Sync with Lampa failed:', e);
        }
    }

    // ==================== AUTO LOAD ====================
    async function autoLoadPlugins() {
        if (!pluginDatabase?.groups) return;

        const autoPlugins = [];
        pluginDatabase.groups.forEach(group => {
            group.plugins?.forEach(plugin => {
                if (plugin.auto_load) autoPlugins.push(plugin);
            });
        });

        console.log('[Lampa Clean] Auto-loading ' + autoPlugins.length + ' base plugins...');

        for (const plugin of autoPlugins) {
            try {
                // Check if already loaded by native Lampa to avoid double execution
                if (!isAlreadyLoaded(plugin.url)) {
                    await loadPlugin(plugin.url, plugin.name, false);
                }
            } catch (e) {
                console.warn('[Lampa Clean] Auto-load failed:', plugin.name);
            }
        }
    }

    async function loadUserPlugins() {
        // Also ensure they are in native Lampa storage for visibility
        try {
            let nativePlugins = Lampa.Storage.get('plugins') || [];
            if (typeof nativePlugins === 'string') nativePlugins = nativePlugins.split(',').filter(p => p);

            let changed = false;
            installedPlugins.forEach(p => {
                const url = p.url;
                if (!nativePlugins.some(np => {
                    if (!np) return false;
                    const npUrl = typeof np === 'string' ? np : np.url;
                    return npUrl === url;
                })) {
                    nativePlugins.push(url); // String only
                    changed = true;
                }
            });
            if (changed) Lampa.Storage.set('plugins', nativePlugins);
        } catch (e) { }

        console.log('[Lampa Clean] Loading ' + installedPlugins.length + ' user plugins...');

        for (const plugin of installedPlugins) {
            try {
                // Avoid double loading if it's already in autoPlugins or loaded by Lampa
                if (!isAlreadyLoaded(plugin.url)) {
                    await loadPlugin(plugin.url, plugin.name, false);
                }
            } catch (e) {
                console.warn('[Lampa Clean] User plugin load failed:', plugin.name, e);
            }
        }
    }

    function isAlreadyLoaded(url) {
        if (!url) return false;

        const scripts = document.getElementsByTagName('script');
        const fixedUrl = fixUrl(url);
        const cleanTarget = fixedUrl.split('?')[0].toLowerCase();
        const cleanOriginal = url.split('?')[0].toLowerCase();

        // Extract filename for loose matching
        const getFileName = (path) => path.split('/').pop().split('?')[0].toLowerCase();
        const targetFile = getFileName(url);

        for (let i = 0; i < scripts.length; i++) {
            if (!scripts[i].src) continue;

            const src = scripts[i].src.toLowerCase();
            const cleanSrc = src.split('?')[0];

            // 1. Direct match (absolute or relative)
            if (cleanSrc === cleanTarget || cleanSrc === cleanOriginal) return true;

            // 2. Inclusion match (for proxies or CDN paths)
            if (cleanSrc.includes(cleanTarget) || cleanTarget.includes(cleanSrc)) return true;
            if (cleanSrc.includes(cleanOriginal) || cleanOriginal.includes(cleanSrc)) return true;

            // 3. Filename match for local vs remote (safety guard)
            if (targetFile && targetFile.length > 5 && getFileName(src) === targetFile) {
                // Only if it's likely a custom plugin (more than just "index.js")
                return true;
            }
        }
        return false;
    }

    // ==================== NOTIFICATIONS ====================
    function notify(message) {
        if (window.Lampa?.Noty?.show) {
            Lampa.Noty.show(message);
        } else {
            console.log('[Lampa Clean]', message);
        }
    }

    // ==================== CATEGORY POPUP ====================
    function showCategoryPlugins(group) {
        const items = group.plugins.map(plugin => {
            const installed = isPluginInstalled(plugin);
            const indicator = installed ? '[YES]' : '[NO]';
            const httpWarning = plugin.url?.startsWith('http://') ? ' (!)' : '';

            return {
                title: indicator + ' ' + plugin.name + httpWarning,
                subtitle: plugin.description || '',
                plugin: plugin,
                installed: installed
            };
        });

        Lampa.Select.show({
            title: group.title,
            items: items,
            onSelect: function (item) {
                Lampa.Select.hide(); // Close current popup first

                if (item.installed) {
                    // Ask to uninstall
                    setTimeout(() => {
                        Lampa.Select.show({
                            title: item.plugin.name,
                            items: [
                                { title: 'Uninstall plugin', action: 'uninstall' },
                                { title: 'Cancel', action: 'cancel' }
                            ],
                            onSelect: function (action) {
                                Lampa.Select.hide();
                                if (action.action === 'uninstall') {
                                    uninstallPlugin(item.plugin);
                                }
                                // Return to category list
                                setTimeout(() => showCategoryPlugins(group), 100);
                            },
                            onBack: function () {
                                setTimeout(() => showCategoryPlugins(group), 100);
                            }
                        });
                    }, 100);
                } else {
                    // Install and return to list
                    installPlugin(item.plugin).then(() => {
                        setTimeout(() => showCategoryPlugins(group), 500);
                    });
                }
            },
            onBack: function () {
                Lampa.Controller.toggle('settings_component');
            }
        });
    }

    // ==================== SETTINGS COMPONENT ====================
    function registerSettingsComponent() {
        const waitForLampa = setInterval(() => {
            if (window.Lampa?.SettingsApi) {
                clearInterval(waitForLampa);

                // Register only ONE component
                Lampa.SettingsApi.addComponent({
                    component: 'lampa_clean_plugins',
                    name: 'My Plugins',
                    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
                });

                // Source selector
                Lampa.SettingsApi.addParam({
                    component: 'lampa_clean_plugins',
                    param: {
                        name: 'plugin_source',
                        type: 'select',
                        values: {
                            original: 'Original (proxy)',
                            local: 'Local copy'
                        },
                        default: 'original'
                    },
                    field: {
                        name: 'Plugin source',
                        description: 'Updated: ' + (pluginDatabase?.updated || 'N/A')
                    },
                    onChange: function (value) {
                        setPluginSource(value);
                        notify('Source: ' + (value === 'local' ? 'Local' : 'Original'));
                    }
                });

                // Add profiles as buttons
                if (pluginDatabase?.profiles) {
                    pluginDatabase.profiles.forEach((profile, i) => {
                        Lampa.SettingsApi.addParam({
                            component: 'lampa_clean_plugins',
                            param: {
                                name: 'profile_' + i,
                                type: 'trigger',
                                default: ''
                            },
                            field: {
                                name: 'BOX: ' + profile.name,
                                description: profile.description
                            },
                            onChange: function () {
                                installProfile(profile);
                            }
                        });
                    });
                }

                // Add categories as trigger buttons that open popups
                if (pluginDatabase?.groups) {
                    pluginDatabase.groups.forEach((group, gi) => {
                        if (!group.plugins?.length) return;

                        const installedCount = group.plugins.filter(p => isPluginInstalled(p)).length;
                        const indicator = installedCount > 0 ? '[+]' : '[-]';

                        Lampa.SettingsApi.addParam({
                            component: 'lampa_clean_plugins',
                            param: {
                                name: 'category_' + gi,
                                type: 'trigger',
                                default: ''
                            },
                            field: {
                                name: indicator + ' ' + group.title,
                                description: installedCount + ' of ' + group.plugins.length + ' installed'
                            },
                            onChange: function () {
                                showCategoryPlugins(group);
                            }
                        });
                    });
                }

                console.log('[Lampa Clean] Settings v2.2.7 registered');
            }
        }, 100);

        setTimeout(() => clearInterval(waitForLampa), 10000);
    }

    // ==================== STARTUP ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
    } else {
        setTimeout(init, 500);
    }

    // Expose API
    window.LampaClean = {
        install: installPlugin,
        uninstall: uninstallPlugin,
        installProfile: installProfile,
        getInstalled: () => [...installedPlugins],
        getDatabase: () => pluginDatabase,
        reload: loadPluginDatabase
    };

})();
