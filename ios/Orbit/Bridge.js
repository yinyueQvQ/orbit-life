(() => {
  const call = (operation, payload = {}) => window.webkit.messageHandlers.orbit.postMessage({ operation, ...payload });
  let session = false;
  let ai = false;
  if (!crypto.randomUUID) {
    Object.defineProperty(crypto, 'randomUUID', { value() {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 15) | 64;
      bytes[8] = (bytes[8] & 63) | 128;
      const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
      return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
    } });
  }
  window.OrbitNative = {
    async initialize() { ({ session, ai } = await call('status')); },
    hasSession: () => session,
    async clearSession() { await call('clearSession'); session = false; },
    configured: () => ai,
    async configure() {
      try {
        ai = await call('configure');
        window.dispatchEvent(new Event('orbit:configured'));
      } catch (error) { alert(error.message); }
    },
    loadWorkspace: () => call('loadWorkspace'),
    saveWorkspace: (_, value) => call('saveWorkspace', { value }),
    loadGuestImage: id => call('loadImage', { id }),
    saveGuestImage: value => call('saveImage', { value }),
    deleteGuestImage: id => call('deleteImage', { id }),
    async saveDocument(name, value) {
      try { await call('export', { name, value }); }
      catch (error) { alert(error.message); }
    },
    request(id, raw) {
      call('request', { request: JSON.parse(raw) }).then(
        result => window.__orbitNativeResult(id, result),
        error => window.__orbitNativeResult(id, { error: error.message })
      );
    }
  };
})();
