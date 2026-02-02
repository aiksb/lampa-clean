# 🔧 Настройка TMDB Proxy на Cloudflare Workers

## Проблема

Текущий прокси `tmdblapi.bylampa.online` не работает (ERR_CONNECTION_CLOSED).
TMDB API недоступен напрямую из РФ.

## Решение: Свой прокси на Cloudflare Workers

### Шаг 1: Создать Cloudflare Worker

1. Войти в https://dash.cloudflare.com
2. Перейти в **Workers & Pages** → **Create application** → **Create Worker**
3. Назвать: `tmdb-proxy`
4. Вставить код ниже
5. Нажать **Save and Deploy**

### Шаг 2: Код Worker'а

```javascript
// TMDB Proxy for Lampa
// Allows access to TMDB API from regions where it's blocked

const TMDB_BASE = 'https://api.themoviedb.org';
const IMAGE_BASE = 'https://image.tmdb.org';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Determine target based on path
  let targetUrl;
  const path = url.pathname;
  
  if (path.startsWith('/t/p/') || path.startsWith('/t/')) {
    // Image requests
    targetUrl = IMAGE_BASE + path.replace('/t/', '/t/');
  } else if (path.startsWith('/3/')) {
    // API requests
    targetUrl = TMDB_BASE + path + url.search;
  } else {
    return new Response('Invalid path', { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Lampa/3.1.5'
      }
    });

    // Clone response and add CORS headers
    const newResponse = new Response(response.body, response);
    
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newResponse.headers.set(key, value);
    });

    return newResponse;
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
```

### Шаг 3: Получить URL

После деплоя получите URL вида:
```
https://tmdb-proxy.YOUR_SUBDOMAIN.workers.dev
```

### Шаг 4: Настроить кастомный домен (опционально)

1. В настройках Worker → **Triggers** → **Custom Domains**
2. Добавить: `tmdb.aiksb.com` (или другой ваш домен)
3. Cloudflare автоматически выпустит SSL

---

## Интеграция в Lampa

### Вариант 1: Через настройки Lampa

1. Открыть Lampa → Настройки → Основные
2. Найти **TMDB Proxy** или **API Прокси**
3. Вставить ваш URL: `https://tmdb-proxy.YOUR.workers.dev`

### Вариант 2: Создать свой плагин

Создать файл `tmdb-proxy-custom.js`:

```javascript
(function() {
  'use strict';
  
  // Ваш Cloudflare Worker URL
  const PROXY_URL = 'https://tmdb-proxy.YOUR.workers.dev';
  
  // Перехват запросов к TMDB
  if (window.Lampa) {
    const originalFetch = window.fetch;
    
    window.fetch = function(url, options) {
      if (typeof url === 'string') {
        // Заменяем TMDB URLs на прокси
        if (url.includes('api.themoviedb.org')) {
          url = url.replace('https://api.themoviedb.org', PROXY_URL);
        }
        if (url.includes('image.tmdb.org')) {
          url = url.replace('https://image.tmdb.org', PROXY_URL);
        }
        // Заменяем сломанный bylampa прокси
        if (url.includes('tmdblapi.bylampa.online')) {
          url = url.replace('https://tmdblapi.bylampa.online', PROXY_URL);
        }
      }
      
      return originalFetch.call(this, url, options);
    };
    
    console.log('[TMDB Proxy] Custom proxy activated:', PROXY_URL);
  }
})();
```

---

## Тестирование

```bash
# Проверить работу прокси
curl "https://tmdb-proxy.YOUR.workers.dev/3/movie/popular?api_key=YOUR_KEY&language=ru"

# Должен вернуть JSON с фильмами
```

---

## Лимиты Cloudflare Workers (Free Tier)

- 100,000 запросов в день
- 10мс CPU time на запрос
- Для личного использования более чем достаточно

---

**Создано**: 2026-02-02
**Статус**: Готово к деплою
