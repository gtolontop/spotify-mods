(() => {
  const key = "spotify-plugin-diagnostics";
  const records = [];
  const record = (kind, detail) => {
    records.push({ kind, detail, time: Date.now() });
    if (records.length > 40) records.shift();
    localStorage.setItem(key, JSON.stringify(records));
  };
  window.addEventListener("error", event => record("error", {
    message: event.message,
    source: String(event.filename || event.target?.src || "").split("?")[0],
    stack: String(event.error?.stack || "").slice(0, 1400),
  }), true);
  window.addEventListener("unhandledrejection", event => record("rejection", {
    message: String(event.reason?.message || event.reason),
    stack: String(event.reason?.stack || "").slice(0, 1400),
  }));
  const originalError = console.error;
  console.error = (...args) => {
    if (args.some(value => /spicy|lyrics|full app display|adblockify/i.test(String(value)))) {
      record("console-error", args.map(value => String(value?.stack || value)).join(" ").slice(0, 1800));
    }
    originalError.apply(console, args);
  };
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const address = typeof args[0] === "string" ? args[0] : args[0]?.url;
    let url;
    try { url = new URL(address, location.href); } catch { return originalFetch(...args); }
    if (!url.hostname.endsWith("spicylyrics.org")) return originalFetch(...args);
    try {
      const response = await originalFetch(...args);
      record("spicy-service", { path: url.pathname, status: response.status });
      return response;
    } catch (error) {
      record("spicy-service", { path: url.pathname, error: String(error.message) });
      throw error;
    }
  };
  for (const delay of [0, 1000, 5000, 15000]) setTimeout(() => {
    const s = window.Spicetify;
    record("capabilities", {
      delay, react: !!s?.React, reactDOM: !!s?.ReactDOM,
      snackbar: !!s?.Snackbar, platform: !!s?.Platform,
      uri: !!s?.URI, tippy: !!s?.Tippy,
      player: !!s?.Player?.data, history: s?.Platform?.History?.location?.pathname,
      track: !!s?.Player?.data?.item?.uri,
      metadata: !!s?.Player?.data?.item?.metadata,
      fullscreen: !!document.querySelector("#fad-main"),
      spicy: [...document.querySelectorAll("[id]")].filter(e => /spicy/i.test(e.id)).map(e => e.id).slice(0, 12),
      lyricContainers: [...document.querySelectorAll(".LyricsContent")].map(element => ({
        textLength: element.textContent.length, elements: element.children.length,
      })),
      adblockStyle: !!document.querySelector("style.adblockify"),
      adManagers: Object.keys(s?.Platform?.AdManagers || {}),
      productState: !!(s?.Platform?.UserAPI?._product_state || s?.Platform?.UserAPI?._product_state_service || s?.Platform?.ProductStateAPI?.productStateApi),
    });
  }, delay);
  let previousRoute;
  let historyObserved = false;
  const routeTimer = setInterval(() => {
    const history = window.Spicetify?.Platform?.History;
    if (history?.listen && !historyObserved) {
      historyObserved = true;
      history.listen(event => record("history-event", {
        direct: event?.pathname ?? null, wrapped: event?.location?.pathname ?? null,
      }));
    }
    const route = window.Spicetify?.Platform?.History?.location?.pathname;
    const pages = [...document.querySelectorAll("#SpicyLyricsPage")].map(page => ({
      parent: page.parentElement?.className,
      inMain: !!page.closest(".Root__main-view, #main-view"),
      textLength: page.textContent.length,
    }));
    const stateKey = JSON.stringify({ route, pages });
    if (stateKey !== previousRoute) {
      previousRoute = stateKey;
      record("route", {
        route,
        pages,
        containers: [...document.querySelectorAll("main, [role='main'], .main-view-container, .Root__main-view, #main-view")].slice(0, 8).map(element => ({ tag: element.tagName, className: element.className, id: element.id })),
        mainScrollRoot: !!document.querySelector(".Root__main-view .main-view-container div[data-overlayscrollbars-viewport]"),
        mainLegacyScroll: !!document.querySelector(".Root__main-view .main-view-container .main-view-container__scroll-node-child"),
      });
    }
  }, 1000);
  setTimeout(() => clearInterval(routeTimer), 180000);
  setTimeout(async () => {
    const s = window.Spicetify;
    const product = s?.Platform?.UserAPI?._product_state || s?.Platform?.UserAPI?._product_state_service || s?.Platform?.ProductStateAPI?.productStateApi;
    const managers = s?.Platform?.AdManagers || {};
    const flags = Object.fromEntries(Object.entries(managers).filter(([, value]) => value && typeof value === "object").map(([name, manager]) => [name,
      Object.fromEntries(Object.entries(manager).filter(([key, value]) => /enable|disable/i.test(key) && typeof value === "boolean"))
    ]));
    try {
      const values = typeof product?.getValues === "function" ? await product.getValues({ keys: ["ads"] }) : null;
      record("adblock-status", { ads: values?.pairs?.ads ?? null, flags });
    } catch (error) { record("adblock-status", { error: String(error.message), flags }); }
  }, 16000);
})();
