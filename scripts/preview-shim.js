// Stands in for the extension APIs when the content scripts run in an ordinary page served
// by scripts/preview.ts. Storage persists in localStorage; MANIFEST is filled in by the server.
(() => {
  const listeners = new Set();
  const area = (name) => {
    const prefix = `phn-preview:${name}:`;
    const read = (key) => {
      const raw = localStorage.getItem(prefix + key);
      return raw === null ? undefined : JSON.parse(raw);
    };
    const allKeys = () =>
      Object.keys(localStorage).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));
    const notify = (changes) => {
      for (const listener of listeners) listener(changes, name);
    };
    return {
      async get(keys) {
        const wanted = keys == null ? allKeys() : typeof keys === "string" ? [keys] : keys;
        const found = {};
        for (const key of wanted) {
          const value = read(key);
          if (value !== undefined) found[key] = value;
        }
        return found;
      },
      async set(items) {
        const changes = {};
        for (const [key, newValue] of Object.entries(items)) {
          changes[key] = { oldValue: read(key), newValue };
          localStorage.setItem(prefix + key, JSON.stringify(newValue));
        }
        notify(changes);
      },
      async remove(keys) {
        for (const key of typeof keys === "string" ? [keys] : keys) localStorage.removeItem(prefix + key);
      },
    };
  };

  window.chrome = {
    ...window.chrome,
    storage: {
      sync: area("sync"),
      local: area("local"),
      onChanged: { addListener: (listener) => listeners.add(listener) },
    },
    runtime: { getManifest: () => MANIFEST, getURL: (path) => `/__preview/${path}` },
  };

  const events = new EventSource("/__preview/events");
  events.addEventListener("css", () => {
    const link = document.querySelector('link[href^="/__preview/content.css"]');
    if (link) link.href = `/__preview/content.css?${Date.now()}`;
  });
  events.addEventListener("reload", () => location.reload());
})();
