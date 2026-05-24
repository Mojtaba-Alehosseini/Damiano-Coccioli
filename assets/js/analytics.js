/* analytics.js — self-contained visitor tracking, no third-party account needed.
 * Uses: abacus.jasoncameron.dev (counters) + ntfy.sh (live feed) + ipapi.co (geo).
 * Privacy: aggregates per-dimension counts. The live feed contains visitor details
 * (country/city, browser, page, etc.) but no PII beyond what an HTTP request reveals.
 */
(function() {
  'use strict';

  // ===== Configuration =====
  const NAMESPACE = 'dc-coccioli-mc26-x7k9p';   // unique per deployment, semi-private
  const NTFY_TOPIC = 'dc-coccioli-live-x7k9p2m'; // semi-private topic for the live feed
  const COUNTER_BASE = 'https://abacus.jasoncameron.dev/hit/' + NAMESPACE;

  // Skip tracking for dashboard viewers (so they don't pollute their own stats)
  if (location.pathname.includes('/admin-dc-2026')) return;

  // ===== Helpers =====
  function fire(url, opts) {
    try {
      fetch(url, Object.assign({ mode: 'no-cors', cache: 'no-store' }, opts || {})).catch(() => {});
    } catch (e) {}
  }

  function inc(key) {
    // Sanitize: lowercase alphanumeric + underscore + hyphen, max 40 chars
    const safe = String(key).toLowerCase().replace(/[^a-z0-9_-]/g, '_').substring(0, 40);
    fire(COUNTER_BASE + '/' + safe);
  }

  function detectBrowser() {
    const ua = navigator.userAgent;
    if (/Edg\//i.test(ua)) return 'edge';
    if (/OPR\/|Opera/i.test(ua)) return 'opera';
    if (/SamsungBrowser/i.test(ua)) return 'samsung';
    if (/Firefox/i.test(ua)) return 'firefox';
    if (/Chrome/i.test(ua)) return 'chrome';
    if (/Safari/i.test(ua)) return 'safari';
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
    if (!p) p = 'home';
    return p.replace(/\//g, '-').substring(0, 40) || 'home';
  }

  async function track() {
    // Per-page session de-duplication: don't double-count refreshes within 30s
    try {
      const last = sessionStorage.getItem('_dc_a_' + pageKey());
      if (last && Date.now() - parseInt(last, 10) < 30000) return;
      sessionStorage.setItem('_dc_a_' + pageKey(), String(Date.now()));
    } catch (e) {}

    const device = detectDevice();
    const browser = detectBrowser();
    const lang = (navigator.language || 'xx').toLowerCase().split('-')[0];
    const page = pageKey();
    const refDomain = document.referrer ? (new URL(document.referrer).hostname || 'direct') : 'direct';
    const refKey = refDomain.replace(/^www\./, '').replace(/\W/g, '_').substring(0, 30);

    // Increment aggregate counters
    inc('total');
    inc('page-' + page);
    inc('device-' + device);
    inc('browser-' + browser);
    inc('lang-' + lang);
    inc('ref-' + refKey);
    inc('hour-' + new Date().getUTCHours());
    inc('dow-' + new Date().getUTCDay());

    // Today's date counter (YYYYMMDD)
    const d = new Date();
    const ymd = d.getUTCFullYear() + ('0' + (d.getUTCMonth() + 1)).slice(-2) + ('0' + d.getUTCDate()).slice(-2);
    inc('day-' + ymd);

    // Try to geo-locate (best-effort, anonymous public API)
    let geo = {};
    try {
      const r = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
      if (r.ok) {
        geo = await r.json();
        if (geo.country_code) inc('country-' + geo.country_code.toLowerCase());
        if (geo.city) inc('city-' + String(geo.city).toLowerCase().replace(/\W/g, '_').substring(0, 30));
      }
    } catch (e) {}

    // Send live event to ntfy (for the live feed in the dashboard)
    try {
      const evt = {
        ts: new Date().toISOString(),
        page: location.pathname,
        title: document.title,
        ref: document.referrer || null,
        device, browser,
        lang: navigator.language || null,
        screen: (screen.width || 0) + 'x' + (screen.height || 0),
        country: geo.country_name || null,
        country_code: geo.country_code || null,
        city: geo.city || null,
        region: geo.region || null,
        ip: geo.ip || null,
        org: geo.org || null,
        timezone: geo.timezone || null,
      };
      // ntfy.sh accepts plain POST bodies, no auth needed for free public topics
      fetch('https://ntfy.sh/' + NTFY_TOPIC, {
        method: 'POST',
        body: JSON.stringify(evt),
        headers: {
          'Title': (geo.city || geo.country_name || 'Visitor') + ' — ' + location.pathname,
          'Tags': device + ',' + browser
        },
        keepalive: true,
        mode: 'no-cors'
      }).catch(() => {});
    } catch (e) {}
  }

  // Fire after page is interactive, don't block render
  if (document.readyState === 'complete') {
    setTimeout(track, 200);
  } else {
    window.addEventListener('load', function() { setTimeout(track, 200); }, { once: true });
  }
})();
