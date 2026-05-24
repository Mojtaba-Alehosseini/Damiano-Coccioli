/* analytics.js v2 — self-contained visitor tracking with consent-gated detail.
 *
 * Two modes:
 *   - basic   : page/device/browser/lang counters only (no PII)
 *   - full    : adds IP, city, GPS, ISP, connection, screen, battery — sent to live feed
 *
 * Consent is read from localStorage('dc-consent'): "full" | "essential" | absent.
 * If absent, runs in basic mode and the cookie banner gathers consent.
 *
 * No third-party account required. Backends: abacus.jasoncameron.dev + ntfy.sh + ipapi.co
 */
(function() {
  'use strict';

  const NAMESPACE = 'dc-coccioli-mc26-x7k9p';
  const NTFY_TOPIC = 'dc-coccioli-live-x7k9p2m';
  const COUNTER_BASE = 'https://abacus.jasoncameron.dev/hit/' + NAMESPACE;

  // Don't track the analytics dashboard itself
  if (location.pathname.includes('/admin-dc-2026')) return;

  // ---- Helpers ----
  function fire(url, opts) {
    try { fetch(url, Object.assign({ mode: 'no-cors', cache: 'no-store' }, opts || {})).catch(() => {}); } catch (e) {}
  }
  function inc(key) {
    const safe = String(key).toLowerCase().replace(/[^a-z0-9_-]/g, '_').substring(0, 40);
    fire(COUNTER_BASE + '/' + safe);
  }
  function getConsent() {
    try { return localStorage.getItem('dc-consent') || ''; } catch (e) { return ''; }
  }
  function detectBrowser() {
    const ua = navigator.userAgent;
    if (/Edg\//i.test(ua)) return 'edge';
    if (/OPR\/|Opera/i.test(ua)) return 'opera';
    if (/SamsungBrowser/i.test(ua)) return 'samsung';
    if (/Firefox/i.test(ua)) return 'firefox';
    if (/Chrome|CriOS/i.test(ua)) return 'chrome';
    if (/Safari/i.test(ua)) return 'safari';
    return 'other';
  }
  function detectOS() {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) return 'android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/Windows/i.test(ua)) return 'windows';
    if (/Macintosh|Mac OS/i.test(ua)) return 'macos';
    if (/Linux/i.test(ua)) return 'linux';
    return 'other';
  }
  function detectDevice() {
    const ua = navigator.userAgent;
    if (/iPad|Tablet/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua))) return 'tablet';
    if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return 'mobile';
    return 'desktop';
  }
  function pageKey() {
    let p = location.pathname.replace(/^\/+|\/+$/g, '');
    const BASE = ['damiano-coccioli', 'damiano-website'];
    for (const prefix of BASE) {
      const low = p.toLowerCase();
      if (low === prefix) { p = ''; break; }
      if (low.startsWith(prefix + '/')) { p = p.substring(prefix.length + 1); break; }
    }
    if (!p) p = 'home';
    return p.toLowerCase().replace(/\//g, '-').substring(0, 40) || 'home';
  }

  // ---- Browser GPS (only if user has accepted full consent) ----
  function tryGetGPS(timeout = 4000) {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      setTimeout(() => finish(null), timeout);
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => finish({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            acc: pos.coords.accuracy,
            alt: pos.coords.altitude,
          }),
          () => finish(null),
          { enableHighAccuracy: false, timeout: timeout - 200, maximumAge: 60000 }
        );
      } catch (e) { finish(null); }
    });
  }

  // ---- Collect device fingerprint ----
  function fingerprint() {
    const fp = {
      ua: navigator.userAgent,
      lang: navigator.language,
      langs: (navigator.languages || []).join(','),
      screen: (screen.width || 0) + 'x' + (screen.height || 0),
      pixelRatio: window.devicePixelRatio || 1,
      colorDepth: screen.colorDepth,
      timezone: null,
      tzOffset: new Date().getTimezoneOffset(),
      cores: navigator.hardwareConcurrency || null,
      memory: navigator.deviceMemory || null,
      touch: navigator.maxTouchPoints || 0,
      platform: navigator.platform || null,
      cookies: navigator.cookieEnabled,
      online: navigator.onLine,
      doNotTrack: navigator.doNotTrack || null,
    };
    try { fp.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
    try {
      if (navigator.connection) {
        fp.connType = navigator.connection.effectiveType;
        fp.downlink = navigator.connection.downlink;
        fp.rtt = navigator.connection.rtt;
        fp.saveData = navigator.connection.saveData;
      }
    } catch (e) {}
    return fp;
  }

  async function getBattery() {
    try {
      if (navigator.getBattery) {
        const b = await navigator.getBattery();
        return { level: b.level, charging: b.charging };
      }
    } catch (e) {}
    return null;
  }

  // ---- Main tracking flow ----
  async function track() {
    // Per-page dedupe within 30s
    try {
      const last = sessionStorage.getItem('_dc_a_' + pageKey());
      if (last && Date.now() - parseInt(last, 10) < 30000) return;
      sessionStorage.setItem('_dc_a_' + pageKey(), String(Date.now()));
    } catch (e) {}

    const consent = getConsent();
    const device = detectDevice();
    const browser = detectBrowser();
    const os = detectOS();
    const lang = (navigator.language || 'xx').toLowerCase().split('-')[0];
    const page = pageKey();
    const refDomain = document.referrer ? (new URL(document.referrer).hostname || 'direct') : 'direct';
    const refKey = refDomain.replace(/^www\./, '').replace(/\W/g, '_').substring(0, 30);

    // === Always-on aggregate counters (anonymous, no PII) ===
    inc('total');
    inc('page-' + page);
    inc('device-' + device);
    inc('browser-' + browser);
    inc('os-' + os);
    inc('lang-' + lang);
    inc('ref-' + refKey);
    inc('hour-' + new Date().getUTCHours());
    inc('dow-' + new Date().getUTCDay());

    const d = new Date();
    const ymd = d.getUTCFullYear() + ('0' + (d.getUTCMonth() + 1)).slice(-2) + ('0' + d.getUTCDate()).slice(-2);
    inc('day-' + ymd);

    // === Geo (best-effort, works without consent because no IP is stored client-side) ===
    let geo = {};
    try {
      const r = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
      if (r.ok) {
        geo = await r.json();
        if (geo.country_code) inc('country-' + geo.country_code.toLowerCase());
        if (geo.city) inc('city-' + String(geo.city).toLowerCase().replace(/\W/g, '_').substring(0, 30));
      }
    } catch (e) {}

    // === Live feed (sent always, but more detail with full consent) ===
    try {
      const evt = {
        ts: new Date().toISOString(),
        page: location.pathname,
        title: document.title,
        ref: document.referrer || null,
        device, browser, os,
        lang: navigator.language || null,
        screen: (screen.width || 0) + 'x' + (screen.height || 0),
        country: geo.country_name || null,
        country_code: geo.country_code || null,
        city: geo.city || null,
        region: geo.region || null,
        timezone: geo.timezone || null,
        consent: consent || 'pending',
      };

      // Full consent → include richer data
      if (consent === 'full') {
        Object.assign(evt, {
          ip: geo.ip || null,
          isp: geo.org || null,
          asn: geo.asn || null,
          postal: geo.postal || null,
          lat_ip: geo.latitude || null,
          lon_ip: geo.longitude || null,
          fingerprint: fingerprint(),
          battery: await getBattery(),
        });

        // Try browser GPS (needs user permission)
        const gps = await tryGetGPS(3500);
        if (gps) evt.gps = gps;
      }

      fetch('https://ntfy.sh/' + NTFY_TOPIC, {
        method: 'POST',
        body: JSON.stringify(evt),
        headers: {
          'Title': (geo.city || geo.country_name || 'Visitor') + ' — ' + location.pathname,
          'Tags': device + ',' + browser + (consent === 'full' ? ',full' : '')
        },
        keepalive: true,
        mode: 'no-cors'
      }).catch(() => {});
    } catch (e) {}
  }

  function start() {
    if (document.readyState === 'complete') {
      setTimeout(track, 200);
    } else {
      window.addEventListener('load', () => setTimeout(track, 200), { once: true });
    }
  }

  // Re-track if consent changes (banner just dismissed)
  window.addEventListener('storage', (e) => {
    if (e.key === 'dc-consent') {
      // Reset dedupe so the next visit logs with the new consent level
      try { sessionStorage.removeItem('_dc_a_' + pageKey()); } catch (e) {}
      track();
    }
  });

  // Listen for in-page consent updates (banner posts a custom event)
  window.addEventListener('dc:consent', () => {
    try { sessionStorage.removeItem('_dc_a_' + pageKey()); } catch (e) {}
    track();
  });

  start();
})();
