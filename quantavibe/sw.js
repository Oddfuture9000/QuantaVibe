// QuantaVibe Service Worker v1.0
// Provides offline caching, background sync, and PWA install support

const CACHE_NAME = 'quantavibe-v1.0';
const RUNTIME_CACHE = 'quantavibe-runtime-v1.0';

// Core app shell - files needed for offline functionality
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './qvicon.ico',
  // Core JS modules
  './js/GeminiClient.js',
  './js/OracleConnector.js',
  './js/ChronicleManager.js',
  './js/SentinelCore.js',
  './js/PluginTemplates.js',
  // VizRouter.js removed (3D visuals deprecated for Paper-Trail Pivot)
  './js/PluginWorkshop.js',
  './js/FeatureLoader.js',
  // Feature modules
  './features/FileSystemManager.js',
  './features/registry.js',
  './features/SentinelVoice.js',
  './features/qubitGame.js',
  './features/quantum-puzzle-game.js',
  './features/qs_file_manager.js',
  './features/f_sentinel_demo.js',
  './features/feature_hardware_designer.js',
  './features/gate_cost_calculator.js',
  './features/qsharp-loader.js',
  './features/qsharpSave.js',
  './features/q_sharp_file_manager.js'
  // AUDIT FIX: Icons removed from precache until generated
  // Re-add once icons exist in /icons/ directory
];

// CDN resources to cache on first use (runtime caching)
const CDN_ALLOWLIST = [
  'cdn.tailwindcss.com',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com'
];

// ------- Install Event -------
self.addEventListener('install', (event) => {
  console.log('[SW] Installing QuantaVibe Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell...');
        // Use addAll with error tolerance - some files may not exist yet
        return Promise.allSettled(
          APP_SHELL.map(url => 
            cache.add(url).catch(err => {
              console.warn(`[SW] Failed to cache: ${url}`, err.message);
            })
          )
        );
      })
      .then(() => {
        console.log('[SW] App shell cached successfully');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// ------- Activate Event -------
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Claiming clients...');
      return self.clients.claim(); // Take control of all pages
    })
  );
});

// ------- Fetch Event (Network-First for API, Cache-First for assets) -------
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension, ws://, and other non-http
  if (!event.request.url.startsWith('http')) return;

  // API calls (Gemini) - always network first, no cache
  if (url.hostname.includes('generativelanguage.googleapis.com') ||
      url.hostname.includes('quantum-computing.ibm.com') ||
      url.hostname.includes('arxiv.org')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({
          error: 'offline',
          message: 'QuantaVibe is offline. API features require an internet connection.'
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // CDN resources - Stale-While-Revalidate
  if (CDN_ALLOWLIST.some(domain => url.hostname.includes(domain))) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Local assets - Cache first, network fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached but also update in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // Not in cache - fetch from network
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// ------- Background Sync (for saving circuits offline) -------
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-circuit') {
    console.log('[SW] Background sync: syncing circuit data...');
    event.waitUntil(syncCircuitData());
  }
});

async function syncCircuitData() {
  // Placeholder for future offline circuit save & sync
  console.log('[SW] Circuit data sync placeholder - implement with IndexedDB');
}

// ------- Push Notifications (optional future feature) -------
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'QuantaVibe update available',
    icon: './icons/icon-192.png',
    badge: './icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || './' },
    actions: [
      { action: 'open', title: 'Open QuantaVibe' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'QuantaVibe', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || './')
    );
  }
});

console.log('[SW] QuantaVibe Service Worker loaded.');
