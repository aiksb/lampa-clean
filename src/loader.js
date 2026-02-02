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
        return installedPlugins.some(p => p.url === plugin.url);
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

            notify('✓ ' + plugin.name + ' установлен');
            return true;
        } catch (error) {
            console.error('[Lampa Clean] Install failed:', error);
            notify('✗ Ошибка: ' + plugin.name);
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
        notify('✓ ' + plugin.name + ' удален');
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

        console.log('[Lampa Clean] Auto-loading ' + autoPlugins.length + ' plugins...');

        for (const plugin of autoPlugins) {
            try {
                await loadPlugin(plugin.url, plugin.name, false);
            } catch (e) {
                console.warn('[Lampa Clean] Auto-load failed:', plugin.name);
            }
        }
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
                if (item.installed) {
                    // Ask to uninstall
                    Lampa.Select.show({
                        title: item.plugin.name,
                        items: [
                            { title: '🗑 Удалить плагин', action: 'uninstall' },
                            { title: '❌ Отмена', action: 'cancel' }
                        ],
                        onSelect: function (action) {
                            if (action.action === 'uninstall') {
                                uninstallPlugin(item.plugin);
                            }
                        }
                    });
                } else {
                    // Install
                    installPlugin(item.plugin);
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
