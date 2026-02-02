/**
 * Lampa Clean - Enhanced Plugin System v2.0
 * 
 * Features:
 * - Integration into Settings menu
 * - Plugin profiles for batch installation
 * - Progress indicators
 * - No-reload installation
 * - HTTPS proxy for HTTP plugins
 * - Local plugin caching
 */

(function () {
    'use strict';

    // ==================== CONFIGURATION ====================
    const CONFIG = {
        PLUGIN_DB_URL: './plugins.json',
        STORAGE_KEY: 'lampa_clean_plugins',
        PROFILES_KEY: 'lampa_clean_profiles',
        PLUGIN_TIMEOUT: 15000,
        RETRY_ATTEMPTS: 2,
        RETRY_DELAY: 1000,
        // CORS proxies for HTTP content on HTTPS sites
        CORS_PROXIES: [
            'https://corsproxy.io/?',
            'https://api.allorigins.win/raw?url=',
            'https://cors-anywhere.herokuapp.com/'
        ],
        CURRENT_PROXY_INDEX: 0
    };

    // ==================== STATE ====================
    let pluginDatabase = null;
    let installedPlugins = [];
    let activeInstallations = new Map();
    let isInitialized = false;

    // ==================== INITIALIZATION ====================
    async function init() {
        if (isInitialized) return;

        console.log('[Lampa Clean] Initializing enhanced plugin system v2.0...');

        try {
            await loadPluginDatabase();
            loadInstalledPlugins();
            await autoLoadPlugins();
            injectSettingsMenu();

            isInitialized = true;
            console.log('[Lampa Clean] Plugin system initialized successfully');
        } catch (error) {
            console.error('[Lampa Clean] Failed to initialize:', error);
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
            console.error('[Lampa Clean] Failed to load database:', error);
            // Use embedded fallback
            pluginDatabase = { groups: [], profiles: [] };
        }
    }

    function loadInstalledPlugins() {
        try {
            const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
            installedPlugins = stored ? JSON.parse(stored) : [];
        } catch (error) {
            installedPlugins = [];
        }
    }

    function saveInstalledPlugins() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(installedPlugins));
        } catch (error) {
            console.error('[Lampa Clean] Save failed:', error);
        }
    }

    // ==================== URL HANDLING ====================
    function fixUrl(url) {
        // If we're on HTTPS and URL is HTTP, use proxy
        if (window.location.protocol === 'https:' && url.startsWith('http://')) {
            const proxy = CONFIG.CORS_PROXIES[CONFIG.CURRENT_PROXY_INDEX];
            return proxy + encodeURIComponent(url);
        }
        return url;
    }

    function isHttpUrl(url) {
        return url && url.startsWith('http://');
    }

    // ==================== PLUGIN LOADING ====================
    async function loadPlugin(url, name, showProgress = true) {
        const fixedUrl = fixUrl(url);

        return new Promise((resolve, reject) => {
            // Create progress element
            let progressEl = null;
            if (showProgress) {
                progressEl = showInstallProgress(name, 0);
            }

            const script = document.createElement('script');
            script.src = fixedUrl;
            script.async = true;

            let progress = 0;
            const progressInterval = setInterval(() => {
                progress = Math.min(progress + 10, 90);
                if (progressEl) updateProgress(progressEl, progress);
            }, 200);

            const timeout = setTimeout(() => {
                clearInterval(progressInterval);
                script.remove();
                if (progressEl) removeProgress(progressEl);
                reject(new Error(`Timeout: ${name}`));
            }, CONFIG.PLUGIN_TIMEOUT);

            script.onload = () => {
                clearTimeout(timeout);
                clearInterval(progressInterval);
                if (progressEl) {
                    updateProgress(progressEl, 100);
                    setTimeout(() => removeProgress(progressEl), 500);
                }
                console.log(`[Lampa Clean] Loaded: ${name}`);
                resolve();
            };

            script.onerror = () => {
                clearTimeout(timeout);
                clearInterval(progressInterval);
                script.remove();
                if (progressEl) removeProgress(progressEl);

                // Try next proxy
                if (isHttpUrl(url) && CONFIG.CURRENT_PROXY_INDEX < CONFIG.CORS_PROXIES.length - 1) {
                    CONFIG.CURRENT_PROXY_INDEX++;
                    console.log(`[Lampa Clean] Trying next proxy for ${name}...`);
                    loadPlugin(url, name, showProgress).then(resolve).catch(reject);
                } else {
                    reject(new Error(`Failed to load: ${name}`));
                }
            };

            document.head.appendChild(script);
        });
    }

    // ==================== PROGRESS UI ====================
    function showInstallProgress(name, percent) {
        const container = document.createElement('div');
        container.className = 'lampa-clean-progress';
        container.innerHTML = `
            <div class="lampa-clean-progress__content">
                <div class="lampa-clean-progress__name">${name}</div>
                <div class="lampa-clean-progress__bar">
                    <div class="lampa-clean-progress__fill" style="width: ${percent}%"></div>
                </div>
                <div class="lampa-clean-progress__percent">${percent}%</div>
            </div>
        `;

        container.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: rgba(0,0,0,0.9);
            border: 1px solid #444;
            border-radius: 8px;
            padding: 12px 16px;
            min-width: 200px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            color: white;
        `;

        const style = document.createElement('style');
        style.textContent = `
            .lampa-clean-progress__name { font-size: 13px; margin-bottom: 8px; }
            .lampa-clean-progress__bar { 
                height: 4px; 
                background: #333; 
                border-radius: 2px; 
                overflow: hidden;
            }
            .lampa-clean-progress__fill { 
                height: 100%; 
                background: linear-gradient(90deg, #667eea, #764ba2);
                transition: width 0.2s;
            }
            .lampa-clean-progress__percent { 
                font-size: 11px; 
                color: #888; 
                margin-top: 4px; 
                text-align: right;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(container);
        return container;
    }

    function updateProgress(el, percent) {
        if (!el) return;
        const fill = el.querySelector('.lampa-clean-progress__fill');
        const percentEl = el.querySelector('.lampa-clean-progress__percent');
        if (fill) fill.style.width = percent + '%';
        if (percentEl) percentEl.textContent = percent + '%';
    }

    function removeProgress(el) {
        if (el && el.parentNode) {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.3s';
            setTimeout(() => el.remove(), 300);
        }
    }

    // ==================== INSTALLATION ====================
    async function installPlugin(plugin, showNotify = true) {
        const isInstalled = installedPlugins.some(p => p.url === plugin.url);
        if (isInstalled) {
            if (showNotify) notify(`${plugin.name} уже установлен`, 'info');
            return;
        }

        try {
            await loadPlugin(plugin.url, plugin.name, true);

            installedPlugins.push({
                name: plugin.name,
                url: plugin.url,
                installed_at: new Date().toISOString()
            });
            saveInstalledPlugins();

            if (showNotify) notify(`${plugin.name} установлен ✓`, 'success');

            // Refresh UI if open
            refreshMarketplaceUI();
        } catch (error) {
            console.error(`[Lampa Clean] Install failed:`, error);
            if (showNotify) notify(`Ошибка: ${plugin.name}`, 'error');
        }
    }

    async function installProfile(profile) {
        notify(`Установка профиля: ${profile.name}...`, 'info');

        let installed = 0;
        let failed = 0;

        for (const pluginName of profile.plugins) {
            const plugin = findPluginByName(pluginName);
            if (plugin) {
                try {
                    await installPlugin(plugin, false);
                    installed++;
                } catch (e) {
                    failed++;
                }
            }
        }

        notify(`Профиль установлен: ${installed} из ${profile.plugins.length}`, 'success');
    }

    function findPluginByName(name) {
        if (!pluginDatabase || !pluginDatabase.groups) return null;
        for (const group of pluginDatabase.groups) {
            const plugin = group.plugins.find(p => p.name === name);
            if (plugin) return plugin;
        }
        return null;
    }

    function uninstallPlugin(plugin) {
        installedPlugins = installedPlugins.filter(p => p.url !== plugin.url);
        saveInstalledPlugins();
        notify(`${plugin.name} удален`, 'info');
        refreshMarketplaceUI();
    }

    function isPluginInstalled(url) {
        return installedPlugins.some(p => p.url === url);
    }

    // ==================== AUTO LOAD ====================
    async function autoLoadPlugins() {
        if (!pluginDatabase || !pluginDatabase.groups) return;

        const autoPlugins = [];
        pluginDatabase.groups.forEach(group => {
            group.plugins.forEach(plugin => {
                if (plugin.auto_load) autoPlugins.push(plugin);
            });
        });

        console.log(`[Lampa Clean] Auto-loading ${autoPlugins.length} plugins...`);

        for (const plugin of autoPlugins) {
            try {
                await loadPlugin(plugin.url, plugin.name, false);
            } catch (error) {
                console.warn(`[Lampa Clean] Auto-load failed: ${plugin.name}`);
            }
        }
    }

    // ==================== NOTIFICATIONS ====================
    function notify(message, type = 'info') {
        // Try Lampa's notification system
        if (window.Lampa && window.Lampa.Noty && window.Lampa.Noty.show) {
            window.Lampa.Noty.show(message);
            return;
        }

        // Fallback notification
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            info: '#3498db'
        };

        const el = document.createElement('div');
        el.textContent = message;
        el.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10001;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;

        document.body.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.3s';
            setTimeout(() => el.remove(), 300);
        }, 3000);
    }

    // ==================== SETTINGS INTEGRATION ====================
    function injectSettingsMenu() {
        const checkLampa = setInterval(() => {
            if (window.Lampa && window.Lampa.SettingsApi) {
                clearInterval(checkLampa);

                // Add "Мои плагины" to main settings menu
                Lampa.SettingsApi.addComponent({
                    component: 'my_plugins',
                    name: '🔌 Мои плагины',
                    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
                });

                Lampa.Settings.listener.follow('open', function (e) {
                    if (e.name === 'my_plugins') {
                        renderSettingsContent();
                    }
                });

                console.log('[Lampa Clean] Settings menu injected');
            }
        }, 100);

        setTimeout(() => clearInterval(checkLampa), 10000);
    }

    function renderSettingsContent() {
        const controller = Lampa.Controller.enabled().name;

        Lampa.Settings.clear();

        // ===== PROFILES SECTION =====
        if (pluginDatabase && pluginDatabase.profiles) {
            Lampa.Settings.add('my_plugins_header', {
                type: 'title',
                name: '📦 Профили'
            });

            pluginDatabase.profiles.forEach(profile => {
                Lampa.Settings.add('profile_' + profile.id, {
                    type: 'button',
                    name: profile.name,
                    description: profile.description,
                    onPress: () => installProfile(profile)
                });
            });
        }

        // ===== PLUGIN CATEGORIES =====
        if (pluginDatabase && pluginDatabase.groups) {
            pluginDatabase.groups.forEach((group, gi) => {
                Lampa.Settings.add('group_' + gi, {
                    type: 'title',
                    name: group.title
                });

                group.plugins.forEach((plugin, pi) => {
                    const installed = isPluginInstalled(plugin.url);
                    const httpWarning = isHttpUrl(plugin.url) ? ' ⚠️' : '';

                    Lampa.Settings.add('plugin_' + gi + '_' + pi, {
                        type: 'button',
                        name: (installed ? '✓ ' : '') + plugin.name + httpWarning,
                        description: plugin.description,
                        onPress: () => {
                            if (installed) {
                                uninstallPlugin(plugin);
                            } else {
                                installPlugin(plugin);
                            }
                            // Refresh after action
                            setTimeout(() => renderSettingsContent(), 500);
                        }
                    });
                });
            });
        }

        // ===== INSTALLED SECTION =====
        Lampa.Settings.add('installed_header', {
            type: 'title',
            name: '📥 Установленные (' + installedPlugins.length + ')'
        });

        if (installedPlugins.length === 0) {
            Lampa.Settings.add('no_installed', {
                type: 'info',
                name: 'Нет установленных плагинов'
            });
        } else {
            installedPlugins.forEach((plugin, i) => {
                Lampa.Settings.add('installed_' + i, {
                    type: 'button',
                    name: '✓ ' + plugin.name,
                    description: 'Нажмите для удаления',
                    onPress: () => {
                        uninstallPlugin(plugin);
                        setTimeout(() => renderSettingsContent(), 500);
                    }
                });
            });
        }

        Lampa.Controller.toggle(controller);
    }

    function refreshMarketplaceUI() {
        // If settings page is open, refresh it
        if (Lampa && Lampa.Settings && Lampa.Settings.isActive && Lampa.Settings.isActive()) {
            // Will be refreshed on next render
        }
    }

    // ==================== STARTUP ====================
    // Wait for DOM and Lampa to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
    } else {
        setTimeout(init, 500);
    }

    // Expose API for external use
    window.LampaClean = {
        install: installPlugin,
        uninstall: uninstallPlugin,
        installProfile: installProfile,
        getInstalled: () => [...installedPlugins],
        getDatabase: () => pluginDatabase,
        reload: loadPluginDatabase
    };

})();
