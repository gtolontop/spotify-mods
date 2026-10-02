// Apply this installation's preferences once, before the other extensions load.
(() => {
  const marker = "spotify-local-setup:v1";
  if (localStorage.getItem(marker)) return;
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  };
  const installedKey = "marketplace:installed-extensions";
  const installed = read(installedKey, []);
  const migrated = [
    "Spikerko/spicy-lyrics/", "surfbryce/beautiful-lyrics/",
    "rxri/spicetify-extensions/songstats/", "kyrie25/spicetify-oneko/",
    "spicetify/cli/Extensions/shuffle+.js", "spicetify/cli/Extensions/loopyLoop.js",
  ];
  const preferences = {
    "lyrics-plus:provider:lrclib:on": "true",
    "lyrics-plus:provider:musixmatch:on": "false",
    "lyrics-plus:services-order": JSON.stringify(["lrclib", "local", "spotify", "musixmatch", "netease", "genius"]),
    "lyrics-plus:visual:playbar-button": "true",
    "lyrics-plus:visual:colorful": "true",
    "lyrics-plus:visual:fade-blur": "true",
  };
  const snapshot = Object.fromEntries(
    [installedKey, "full-app-display-config", ...Object.keys(preferences)]
      .map(key => [key, localStorage.getItem(key)])
  );
  localStorage.setItem("spotify-local-setup:previous-settings", JSON.stringify(snapshot));
  if (Array.isArray(installed)) {
    localStorage.setItem(installedKey, JSON.stringify(
      installed.filter(key => !migrated.some(path => key.toLowerCase().includes(path.toLowerCase())))
    ));
  }
  for (const [key, value] of Object.entries(preferences)) localStorage.setItem(key, value);
  const display = read("full-app-display-config", {});
  localStorage.setItem("full-app-display-config", JSON.stringify({
    ...display, lyricsPlus: true, enableFullscreen: true,
    enableProgress: true, enableControl: true, enableFade: true,
  }));
  localStorage.setItem(marker, new Date().toISOString());
})();
