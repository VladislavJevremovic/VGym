const SHELL_URLS = ["/log", "/routines", "/history", "/charts"];
let CACHE_NAME;

// --- IndexedDB helpers for offline queue + API cache ---

const DB_NAME = "vgym-offline";
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("mutations")) {
        db.createObjectStore("mutations", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("api-cache")) {
        db.createObjectStore("api-cache", { keyPath: "url" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function storeMutation(method, url, headers, body) {
  return openDb().then((db) => {
    const tx = db.transaction("mutations", "readwrite");
    tx.objectStore("mutations").add({ method, url, headers, body, timestamp: Date.now() });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  });
}

function getMutations() {
  return openDb().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction("mutations", "readonly");
      const req = tx.objectStore("mutations").getAll();
      req.onsuccess = () => { db.close(); resolve(req.result); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  });
}

function deleteMutation(id) {
  return openDb().then((db) => {
    const tx = db.transaction("mutations", "readwrite");
    tx.objectStore("mutations").delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  });
}

function cacheApiResponse(url, response) {
  return openDb().then((db) => {
    return response.clone().text().then((body) => {
      const tx = db.transaction("api-cache", "readwrite");
      tx.objectStore("api-cache").put({
        url,
        body,
        headers: [...response.headers.entries()],
        status: response.status,
        statusText: response.statusText,
        timestamp: Date.now(),
      });
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      });
    });
  });
}

function getCachedApiResponse(url) {
  return openDb().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction("api-cache", "readonly");
      const req = tx.objectStore("api-cache").get(url);
      req.onsuccess = () => {
        db.close();
        const entry = req.result;
        if (!entry) { resolve(null); return; }
        resolve(new Response(entry.body, {
          status: entry.status,
          statusText: entry.statusText,
          headers: entry.headers,
        }));
      };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  });
}

let flushing = false;

function flushMutationQueue() {
  if (flushing) return Promise.resolve();
  flushing = true;
  return getMutations().then((mutations) => {
    return mutations.reduce((chain, mutation) => {
      return chain.then(() => {
        return fetch(new Request(mutation.url, {
          method: mutation.method,
          headers: mutation.headers,
          body: mutation.body,
        })).then(() => deleteMutation(mutation.id))
          .catch(() => {});
      });
    }, Promise.resolve());
  }).finally(() => { flushing = false; });
}

// --- Service worker lifecycle ---

self.addEventListener("install", (event) => {
  CACHE_NAME = `vgym-${Date.now()}`;
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
    .then(() => flushMutationQueue())
  );
});

self.addEventListener("online", () => {
  flushMutationQueue();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    self.clients.claim();
  }
});

// --- Fetch handling ---

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/")) {
    if (request.method === "GET") {
      event.respondWith(
        fetch(request).then((res) => {
          cacheApiResponse(url.href, res.clone());
          return res;
        }).catch(() =>
          getCachedApiResponse(url.href).then(
            (cached) => cached || new Response(JSON.stringify({ error: "Offline" }), {
              status: 503,
              headers: { "Content-Type": "application/json" },
            })
          )
        )
      );
    } else {
      const cloned = request.clone();
      event.respondWith(
        fetch(request).then((res) => {
          flushMutationQueue();
          return res;
        }).catch(() =>
          cloned.text().then((body) =>
            storeMutation(request.method, request.url, [...cloned.headers.entries()], body)
          ).then(() =>
            new Response(JSON.stringify({ error: "Offline" }), {
              status: 503,
              headers: { "Content-Type": "application/json" },
            })
          )
        )
      );
    }
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return res;
      }))
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/log")))
    );
    return;
  }
});
