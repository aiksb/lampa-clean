/**
 * Lampa Clean - Plugin System v2.2
 * 
 * Fixed: categories inside main component, proper click handlers, colored indicators
 */

(function () {
    'use strict';

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

    // ==================== INITIALIZATION ====================
    async function init() {
        if (isInitialized) return;

        console.log('[Lampa Clean] Initializing plugin system v2.2...');

        try {
            await loadPluginDatabase();
            loadInstalledPlugins();
            await autoLoadPlugins();
            await loadUserPlugins();
            registerSettingsComponent();

            isInitialized = true;
            console.log('[Lampa Clean] Plugin system initialized');
        } catch (error) {
            console.error('[Lampa Clean] Init failed:', error);
        }
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

        if (source === 'local') {
            let filename = url.split('/').pop().split('?')[0];
            if (!filename) {
                const parts = url.split('/').filter(p => p);
                filename = parts[parts.length - 1] + '.js';
            }
            return CONFIG.LOCAL_PLUGINS_BASE + filename;
        }

        if (window.location.protocol === 'https:' && url.startsWith('http://')) {
            const proxy = CONFIG.CORS_PROXIES[CONFIG.CURRENT_PROXY_INDEX];
            return proxy + encodeURIComponent(url);
        }

        return url;
    }

    // ==================== PLUGIN LOADING ====================
    async function loadPlugin(url, name, showProgress = true) {
        const fixedUrl = fixUrl(url);

        return new Promise((resolve, reject) => {
            let progressEl = showProgress ? showInstallProgress(name, 0) : null;

            const script = document.createElement('script');
            script.src = fixedUrl;
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
            p.url === plugin.url ||
            (p.name && plugin.name && p.name === plugin.name)
        );
        if (inOurList) return true;

        // Check Lampa's native list if available
        try {
            const nativePlugins = Lampa.Storage.get('plugins') || [];
            if (Array.isArray(nativePlugins)) {
                return nativePlugins.some(p => (typeof p === 'string' ? p : p.url) === plugin.url);
            }
        } catch (e) { }

        return false;
    }

    async function installPlugin(plugin) {
        if (isPluginInstalled(plugin)) {
            notify(plugin.name + ' уже установлен');
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

            notify('✓ ' + plugin.name + ' установлен');
            return true;
        } catch (error) {
            console.error('[Lampa Clean] Install failed:', plugin.url, error);

            let errorMsg = 'Ошибка загрузки';
            if (error.message === 'Timeout') {
                errorMsg = 'Таймаут - сервер не отвечает';
            } else if (error.message === 'Load failed') {
                errorMsg = 'Сервер недоступен или заблокирован';
            }

            notify('✗ ' + plugin.name + ': ' + errorMsg);
            return false;
        }
    }

    async function installProfile(profile) {
        notify('Установка профиля: ' + profile.name);

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
        notify('Установлено: ' + success + ' из ' + profile.plugins.length);
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
        notify('✓ ' + plugin.name + ' удален');
    }

    function syncWithLampa(url, action) {
        try {
            let nativePlugins = Lampa.Storage.get('plugins') || [];
            if (typeof nativePlugins === 'string') {
                nativePlugins = nativePlugins.split(',').filter(p => p.trim());
            }

            if (action === 'add') {
                const alreadyHas = nativePlugins.some(p => (typeof p === 'string' ? p : p.url) === url);
                if (!alreadyHas) {
                    nativePlugins.push(url);
                }
            } else if (action === 'remove') {
                nativePlugins = nativePlugins.filter(p => (typeof p === 'string' ? p : p.url) !== url);
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
        const scripts = document.getElementsByTagName('script');
        const fixedUrl = fixUrl(url);
        for (let i = 0; i < scripts.length; i++) {
            if (scripts[i].src && (scripts[i].src === url || scripts[i].src.includes(fixedUrl) || url.includes(scripts[i].src))) {
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
            const indicator = installed ? '🟢' : '🔴';
            const httpWarning = plugin.url?.startsWith('http://') ? ' ⚠️' : '';

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
                                { title: '🗑 Удалить плагин', action: 'uninstall' },
                                { title: '❌ Отмена', action: 'cancel' }
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
                    name: 'Мои плагины',
                    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
                });

                // Source selector
                Lampa.SettingsApi.addParam({
                    component: 'lampa_clean_plugins',
                    param: {
                        name: 'plugin_source',
                        type: 'select',
                        values: {
                            original: 'Оригинал (через прокси)',
                            local: 'Локальная копия'
                        },
                        default: 'original'
                    },
                    field: {
                        name: 'Источник плагинов',
                        description: 'Обновлено: ' + (pluginDatabase?.updated || 'N/A')
                    },
                    onChange: function (value) {
                        setPluginSource(value);
                        notify('Источник: ' + (value === 'local' ? 'Локальный' : 'Оригинал'));
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
                                name: '📦 ' + profile.name,
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
                        const indicator = installedCount > 0 ? '🟢' : '🔴';

                        Lampa.SettingsApi.addParam({
                            component: 'lampa_clean_plugins',
                            param: {
                                name: 'category_' + gi,
                                type: 'trigger',
                                default: ''
                            },
                            field: {
                                name: indicator + ' ' + group.title,
                                description: installedCount + ' из ' + group.plugins.length + ' установлено'
                            },
                            onChange: function () {
                                showCategoryPlugins(group);
                            }
                        });
                    });
                }

                console.log('[Lampa Clean] Settings v2.2 registered');
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
