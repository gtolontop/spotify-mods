(() => {
  const key = "spotify-plugin-diagnostics";
  const records = [];
  const record = (kind, detail) => {
    records.push({ kind, detail });
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
  for (const delay of [0, 1000, 5000, 15000]) setTimeout(() => {
    const s = window.Spicetify;
    record("capabilities", {
      delay, react: !!s?.React, reactDOM: !!s?.ReactDOM,
      snackbar: !!s?.Snackbar, platform: !!s?.Platform,
      uri: !!s?.URI, tippy: !!s?.Tippy,
      player: !!s?.Player?.data, history: s?.Platform?.History?.location?.pathname,
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
