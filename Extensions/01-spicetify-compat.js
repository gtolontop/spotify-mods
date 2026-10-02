// Restore the legacy URI interface from Spotify's current native URI module.
// Spotify 1.3.1 exports URI factories rather than the old URI class.
(() => {
  // Cosmos no longer resolves HTTP URLs; keep authenticated HTTP requests
  // restricted to the Spotify endpoints used by these installed plugins.
  Spicetify.PluginHTTP = {
    async getJSON(url) {
      const target = new URL(url);
      if (target.protocol !== "https:" || !["api.spotify.com", "spclient.wg.spotify.com"].includes(target.hostname)) {
        throw new Error("Unsupported Spotify endpoint");
      }
      if (target.hostname === "api.spotify.com" && Number(localStorage.getItem("spotify-api-backoff-until")) > Date.now()) {
        const error = new Error("Spotify HTTP 429");
        error.status = 429;
        throw error;
      }
      let token = Spicetify.Platform?.AuthorizationAPI?.getState?.()?.token?.accessToken;
      if (!token) token = (await Spicetify.CosmosAsync.get("sp://oauth/v2/token"))?.accessToken;
      if (!token) throw new Error("Spotify session is not ready");
      const response = await fetch(target.href, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        if (response.status === 429 && target.hostname === "api.spotify.com") {
          const waitSeconds = Math.max(1, Number(response.headers.get("retry-after")) || 60);
          localStorage.setItem("spotify-api-backoff-until", String(Date.now() + waitSeconds * 1000));
        }
        const error = new Error(`Spotify HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return response.json();
    },
  };
  Spicetify.getAudioData = async uri => {
    const track = Spicetify.URI.from(uri || Spicetify.Player?.data?.item?.uri);
    if (track?.type !== Spicetify.URI.Type.TRACK) throw new Error("Invalid track URI");
    return Spicetify.PluginHTTP.getJSON(
      `https://spclient.wg.spotify.com/audio-attributes/v1/audio-analysis/${track.id}?format=json`
    );
  };
  const install = () => {
    if (Spicetify.URI?.Type && Spicetify.URI?.fromString) return true;
    const chunks = window.rspackChunk || window.rspackChunkclient_web || window.webpackChunkclient_web;
    if (!chunks) return false;
    const require = chunks.push([[Symbol("spotify-uri-compat")], {}, runtime => runtime]);
    if (!require?.m) return false;
    const entry = Object.entries(require.m).find(([, factory]) => {
      const source = String(factory);
      return source.includes("COLLECTION_TRACK_LIST") && source.includes("getBase62IdComponent") && source.includes("ACCOUNT_PROFILE");
    });
    if (!entry) return false;
    const native = require(entry[0]);
    const values = Object.values(native);
    const Type = values.find(value => value?.TRACK === "track" && value?.ALBUM === "album");
    const sampleId = "0000000000000000000000";
    const sample = `spotify:track:${sampleId}`;
    const parse = values.find(value => {
      if (typeof value !== "function") return false;
      try {
        const uri = value(sample);
        return uri?.type === "track" && uri.id === sampleId && uri.toURI?.() === sample;
      } catch { return false; }
    });
    if (!Type || !parse) return false;
    Spicetify.URI = Object.assign({}, native, {
      Type,
      from: (value, options) => { try { return parse(value, options); } catch { return null; } },
      fromString: (value, options) => parse(value, options),
      isTrack: value => { try { return parse(value)?.type === Type.TRACK; } catch { return false; } },
    });
    localStorage.setItem("spotify-uri-compat", "native URI restored");
    return true;
  };
  const start = () => {
    try { if (install()) return; }
    catch (error) { localStorage.setItem("spotify-uri-compat", String(error.message)); }
    setTimeout(start, 100);
  };
  start();
})();
