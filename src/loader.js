/**
 * Lampa Clean Mirror - Plugin Loader System
 * Version: 1.0.0
 * 
 * This script provides a custom plugin marketplace for Lampa.
 * It loads plugins from plugins.json and provides UI for installation.
 */

(function () {
    'use strict';

    // Configuration
    const CONFIG = {
        PLUGIN_DB_URL: './plugins.json',
        STORAGE_KEY: 'lampa_clean_plugins',
        AUTO_LOAD_KEY: 'lampa_clean_autoload',
        PLUGIN_TIMEOUT: 10000, // 10 seconds
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 2000 // 2 seconds
    };

    // State
    let pluginDatabase = null;
    let installedPlugins = [];
    let isInitialized = false;

    /**
     * Initialize the plugin loader
     */
    async function init() {
        if (isInitialized) return;

        console.log('[Lampa Clean] Initializing plugin loader...');

        try {
            // Load plugin database
            await loadPluginDatabase();

            // Load installed plugins from storage
            loadInstalledPlugins();

            // Auto-load plugins marked with auto_load: true
            await autoLoadPlugins();

            // Inject menu button
            injectMenuButton();

            isInitialized = true;
            console.log('[Lampa Clean] Plugin loader initialized successfully');
        } catch (error) {
            console.error('[Lampa Clean] Failed to initialize:', error);
        }
    }

    /**
     * Load plugin database from JSON file
     */
    async function loadPluginDatabase() {
        try {
            const response = await fetch(CONFIG.PLUGIN_DB_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            pluginDatabase = await response.json();
            console.log('[Lampa Clean] Plugin database loaded:', pluginDatabase);
        } catch (error) {
            console.error('[Lampa Clean] Failed to load plugin database:', error);
            throw error;
        }
    }

    /**
     * Load installed plugins from localStorage
     */
    function loadInstalledPlugins() {
        try {
            const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
            installedPlugins = stored ? JSON.parse(stored) : [];
            console.log('[Lampa Clean] Loaded installed plugins:', installedPlugins);
        } catch (error) {
            console.error('[Lampa Clean] Failed to load installed plugins:', error);
            installedPlugins = [];
        }
    }

    /**
     * Save installed plugins to localStorage
     */
    function saveInstalledPlugins() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(installedPlugins));
        } catch (error) {
            console.error('[Lampa Clean] Failed to save installed plugins:', error);
        }
    }

    /**
     * Auto-load plugins marked with auto_load: true
     */
    async function autoLoadPlugins() {
        if (!pluginDatabase || !pluginDatabase.groups) return;

        const autoLoadPlugins = [];

        // Collect all auto-load plugins
        pluginDatabase.groups.forEach(group => {
            group.plugins.forEach(plugin => {
                if (plugin.auto_load === true) {
                    autoLoadPlugins.push(plugin);
                }
            });
        });

        console.log('[Lampa Clean] Auto-loading plugins:', autoLoadPlugins);

        // Load each auto-load plugin
        for (const plugin of autoLoadPlugins) {
            try {
                await loadPlugin(plugin.url, plugin.name);
                console.log(`[Lampa Clean] Auto-loaded: ${plugin.name}`);
            } catch (error) {
                console.error(`[Lampa Clean] Failed to auto-load ${plugin.name}:`, error);
            }
        }
    }

    /**
     * Load a plugin from URL
     */
    async function loadPlugin(url, name, retries = CONFIG.RETRY_ATTEMPTS) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;

            const timeout = setTimeout(() => {
                script.remove();
                if (retries > 0) {
                    console.log(`[Lampa Clean] Retrying ${name} (${retries} attempts left)...`);
                    setTimeout(() => {
                        loadPlugin(url, name, retries - 1)
                            .then(resolve)
                            .catch(reject);
                    }, CONFIG.RETRY_DELAY);
                } else {
                    reject(new Error(`Timeout loading plugin: ${name}`));
                }
            }, CONFIG.PLUGIN_TIMEOUT);

            script.onload = () => {
                clearTimeout(timeout);
                console.log(`[Lampa Clean] Loaded plugin: ${name}`);
                resolve();
            };

            script.onerror = () => {
                clearTimeout(timeout);
                script.remove();
                if (retries > 0) {
                    console.log(`[Lampa Clean] Retrying ${name} (${retries} attempts left)...`);
                    setTimeout(() => {
                        loadPlugin(url, name, retries - 1)
                            .then(resolve)
                            .catch(reject);
                    }, CONFIG.RETRY_DELAY);
                } else {
                    reject(new Error(`Failed to load plugin: ${name}`));
                }
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Install a plugin
     */
    async function installPlugin(plugin) {
        try {
            // Check if already installed
            const isInstalled = installedPlugins.some(p => p.url === plugin.url);
            if (isInstalled) {
                showNotification(`${plugin.name} уже установлен`, 'info');
                return;
            }

            // Load the plugin
            await loadPlugin(plugin.url, plugin.name);

            // Add to installed list
            installedPlugins.push({
                name: plugin.name,
                url: plugin.url,
                installed_at: new Date().toISOString()
            });

            saveInstalledPlugins();
            showNotification(`${plugin.name} успешно установлен`, 'success');

            // Refresh marketplace UI if open
            if (document.querySelector('.lampa-clean-marketplace')) {
                renderMarketplace();
            }
        } catch (error) {
            console.error('[Lampa Clean] Failed to install plugin:', error);
            showNotification(`Ошибка установки ${plugin.name}`, 'error');
        }
    }

    /**
     * Uninstall a plugin
     */
    function uninstallPlugin(plugin) {
        installedPlugins = installedPlugins.filter(p => p.url !== plugin.url);
        saveInstalledPlugins();
        showNotification(`${plugin.name} удален (перезагрузите страницу)`, 'info');

        // Refresh marketplace UI if open
        if (document.querySelector('.lampa-clean-marketplace')) {
            renderMarketplace();
        }
    }

    /**
     * Check if plugin is installed
     */
    function isPluginInstalled(plugin) {
        return installedPlugins.some(p => p.url === plugin.url);
    }

    /**
     * Show notification
     */
    function showNotification(message, type = 'info') {
        // Try to use Lampa's notification system if available
        if (window.Lampa && window.Lampa.Noty) {
            window.Lampa.Noty(message);
        } else {
            // Fallback to console
            console.log(`[Lampa Clean] ${type.toUpperCase()}: ${message}`);

            // Simple visual notification
            const notification = document.createElement('div');
            notification.className = `lampa-clean-notification lampa-clean-notification--${type}`;
            notification.textContent = message;
            notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      `;

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.transition = 'opacity 0.3s';
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    }

    /**
     * Inject "My Plugins" button into Lampa menu
     */
    function injectMenuButton() {
        // Wait for Lampa to be ready
        const checkLampa = setInterval(() => {
            if (window.Lampa && window.Lampa.Activity) {
                clearInterval(checkLampa);

                // Add menu item
                if (window.Lampa.Settings) {
                    try {
                        window.Lampa.Settings.listener.follow('open', function (e) {
                            if (e.name === 'main') {
                                // Add our custom menu item
                                console.log('[Lampa Clean] Adding menu button');
                            }
                        });
                    } catch (error) {
                        console.error('[Lampa Clean] Failed to inject menu button:', error);
                    }
                }

                // Alternative: Add floating button
                addFloatingButton();
            }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => clearInterval(checkLampa), 10000);
    }

    /**
     * Add floating "My Plugins" button
     */
    function addFloatingButton() {
        const button = document.createElement('div');
        button.className = 'lampa-clean-floating-button';
        button.innerHTML = '🔌';
        button.title = 'Мои Плагины';
        button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      cursor: pointer;
      z-index: 9999;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      transition: transform 0.2s, box-shadow 0.2s;
    `;

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
        });

        button.addEventListener('click', () => {
            openMarketplace();
        });

        document.body.appendChild(button);
    }

    /**
     * Open plugin marketplace
     */
    function openMarketplace() {
        renderMarketplace();
    }

    /**
     * Render plugin marketplace UI
     */
    function renderMarketplace() {
        // Remove existing marketplace if any
        const existing = document.querySelector('.lampa-clean-marketplace');
        if (existing) {
            existing.remove();
        }

        // Create marketplace container
        const marketplace = document.createElement('div');
        marketplace.className = 'lampa-clean-marketplace';
        marketplace.innerHTML = `
      <div class="lampa-clean-marketplace__overlay"></div>
      <div class="lampa-clean-marketplace__content">
        <div class="lampa-clean-marketplace__header">
          <h2>🔌 Мои Плагины</h2>
          <button class="lampa-clean-marketplace__close">✕</button>
        </div>
        <div class="lampa-clean-marketplace__body">
          ${renderPluginGroups()}
        </div>
      </div>
    `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
      .lampa-clean-marketplace {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        font-family: Arial, sans-serif;
      }
      
      .lampa-clean-marketplace__overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(5px);
      }
      
      .lampa-clean-marketplace__content {
        position: relative;
        max-width: 900px;
        max-height: 90vh;
        margin: 5vh auto;
        background: #1a1a1a;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      }
      
      .lampa-clean-marketplace__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 30px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      
      .lampa-clean-marketplace__header h2 {
        margin: 0;
        font-size: 24px;
      }
      
      .lampa-clean-marketplace__close {
        background: none;
        border: none;
        color: white;
        font-size: 28px;
        cursor: pointer;
        padding: 0;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.2s;
      }
      
      .lampa-clean-marketplace__close:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .lampa-clean-marketplace__body {
        padding: 30px;
        overflow-y: auto;
        max-height: calc(90vh - 80px);
      }
      
      .lampa-clean-plugin-group {
        margin-bottom: 30px;
      }
      
      .lampa-clean-plugin-group__title {
        font-size: 20px;
        color: #667eea;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid #333;
      }
      
      .lampa-clean-plugin-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 15px;
      }
      
      .lampa-clean-plugin-card {
        background: #2a2a2a;
        border-radius: 8px;
        padding: 15px;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .lampa-clean-plugin-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
      }
      
      .lampa-clean-plugin-card__name {
        font-size: 16px;
        font-weight: bold;
        color: white;
        margin-bottom: 8px;
      }
      
      .lampa-clean-plugin-card__description {
        font-size: 13px;
        color: #aaa;
        margin-bottom: 12px;
        line-height: 1.4;
      }
      
      .lampa-clean-plugin-card__button {
        width: 100%;
        padding: 10px;
        border: none;
        border-radius: 5px;
        font-size: 14px;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .lampa-clean-plugin-card__button--install {
        background: #27ae60;
        color: white;
      }
      
      .lampa-clean-plugin-card__button--install:hover {
        background: #229954;
      }
      
      .lampa-clean-plugin-card__button--uninstall {
        background: #e74c3c;
        color: white;
      }
      
      .lampa-clean-plugin-card__button--uninstall:hover {
        background: #c0392b;
      }
      
      .lampa-clean-plugin-card__badge {
        display: inline-block;
        background: #667eea;
        color: white;
        padding: 2px 8px;
        border-radius: 3px;
        font-size: 11px;
        margin-bottom: 8px;
      }
    `;
        marketplace.appendChild(style);

        // Event listeners
        marketplace.querySelector('.lampa-clean-marketplace__overlay').addEventListener('click', () => {
            marketplace.remove();
        });

        marketplace.querySelector('.lampa-clean-marketplace__close').addEventListener('click', () => {
            marketplace.remove();
        });

        // Add to page
        document.body.appendChild(marketplace);
    }

    /**
     * Render plugin groups
     */
    function renderPluginGroups() {
        if (!pluginDatabase || !pluginDatabase.groups) {
            return '<p style="color: #aaa;">Не удалось загрузить плагины</p>';
        }

        return pluginDatabase.groups.map(group => `
      <div class="lampa-clean-plugin-group">
        <h3 class="lampa-clean-plugin-group__title">${group.title}</h3>
        <div class="lampa-clean-plugin-list">
          ${group.plugins.map(plugin => renderPluginCard(plugin)).join('')}
        </div>
      </div>
    `).join('');
    }

    /**
     * Render plugin card
     */
    function renderPluginCard(plugin) {
        const installed = isPluginInstalled(plugin);
        const autoLoad = plugin.auto_load === true;

        return `
      <div class="lampa-clean-plugin-card">
        ${autoLoad ? '<span class="lampa-clean-plugin-card__badge">AUTO</span>' : ''}
        <div class="lampa-clean-plugin-card__name">${plugin.name}</div>
        <div class="lampa-clean-plugin-card__description">${plugin.description || 'Нет описания'}</div>
        <button 
          class="lampa-clean-plugin-card__button lampa-clean-plugin-card__button--${installed ? 'uninstall' : 'install'}"
          data-plugin='${JSON.stringify(plugin)}'
          onclick="window.lampaCleanPluginAction(this, ${installed})"
        >
          ${installed ? '✓ Удалить' : 'Установить'}
        </button>
      </div>
    `;
    }

    /**
     * Plugin action handler (exposed to global scope for onclick)
     */
    window.lampaCleanPluginAction = function (button, isInstalled) {
        const plugin = JSON.parse(button.getAttribute('data-plugin'));
        if (isInstalled) {
            uninstallPlugin(plugin);
        } else {
            installPlugin(plugin);
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
