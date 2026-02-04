// Service Worker for PWA Domain Switcher
const CACHE_NAME = 'domain-switcher-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/test.html',
  '/manifest.json',
  '/domains.json'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Cache failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete, taking control');
        return self.clients.claim();
      })
  );
});

// Get cached domains.json
async function getCachedDomains() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match('/domains.json');
    
    if (response) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch (error) {
    console.error('[SW] Failed to read cache:', error);
    return null;
  }
}

// Test if domain is available
async function testDomain(domain) {
  try {
    const testUrl = `https://${domain}/sw.js`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(testUrl, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    return false;
  }
}

// Fetch latest domains.json
async function fetchLatestDomains() {
  try {
    const response = await fetch('/domains.json?v=' + Date.now(), {
      cache: 'no-cache'
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Update cache
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/domains.json', response.clone());
      
      return data;
    }
    return null;
  } catch (error) {
    console.log('[SW] Failed to fetch latest config:', error.message);
    return null;
  }
}

// Find working domain
async function findWorkingDomain(currentDomain) {
  let domains = await fetchLatestDomains();
  let usingCached = false;
  
  if (!domains) {
    domains = await getCachedDomains();
    usingCached = true;
  }
  
  if (!domains || !Array.isArray(domains) || domains.length === 0) {
    return null;
  }
  
  if (usingCached) {
    notifyClients({
      type: 'USING_CACHED'
    });
  }
  
  // Test current domain
  notifyClients({
    type: 'DOMAIN_CHECK',
    status: 'checking',
    domain: currentDomain
  });
  
  if (await testDomain(currentDomain)) {
    notifyClients({
      type: 'DOMAIN_CHECK',
      status: 'success',
      domain: currentDomain
    });
    return currentDomain;
  }
  
  notifyClients({
    type: 'DOMAIN_CHECK',
    status: 'failed',
    domain: currentDomain
  });
  
  // Test backup domains
  for (const domain of domains) {
    if (domain === currentDomain) continue;
    
    notifyClients({
      type: 'DOMAIN_CHECK',
      status: 'checking',
      domain: domain
    });
    
    if (await testDomain(domain)) {
      notifyClients({
        type: 'DOMAIN_CHECK',
        status: 'success',
        domain: domain
      });
      
      notifyClients({
        type: 'REDIRECT',
        domain: domain
      });
      
      return domain;
    }
    
    notifyClients({
      type: 'DOMAIN_CHECK',
      status: 'failed',
      domain: domain
    });
  }
  
  return null;
}

// Notify all clients
function notifyClients(message) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage(message);
    });
  });
}

// Message event - handle messages from page
self.addEventListener('message', async (event) => {
  const data = event.data;

  if (data.type === 'CHECK_DOMAIN') {
    const currentDomain = self.location.host;
    const workingDomain = await findWorkingDomain(currentDomain);

    if (workingDomain && workingDomain !== currentDomain) {
      event.source.postMessage({
        type: 'REDIRECT_REQUIRED',
        domain: workingDomain
      });
    }
  }

  if (data.type === 'REFRESH_CONFIG') {
    // Silently refresh domains.json cache in background
    const domains = await fetchLatestDomains();
    if (domains) {
      console.log('[SW] Config refreshed at startup');
    }
  }
});

// Network request interception - cache-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Use network-first for domains.json
  if (url.pathname === '/domains.json') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }
  
  // Use cache-first for other static assets
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          fetch(request)
            .then((response) => {
              if (response.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, response);
                });
              }
            })
            .catch(() => {
              // Network request failed, ignore
            });
          
          return cachedResponse;
        }
        
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
      })
      .catch((error) => {
        console.error('[SW] Request failed:', error);
        return new Response('Offline mode not available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});

console.log('[SW] Service Worker script loaded');
