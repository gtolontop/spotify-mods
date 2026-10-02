const ProviderLRCLIB = (() => {
	async function findLyrics(info) {
		const baseURL = "https://lrclib.net/api/get";
		const durr = info.duration / 1000;
		const params = {
			track_name: info.title,
			artist_name: info.artist,
			album_name: info.album,
			duration: durr,
		};

		const finalURL = `${baseURL}?${Object.keys(params)
			.map((key) => `${key}=${encodeURIComponent(params[key])}`)
			.join("&")}`;

		const body = await fetch(finalURL, {
			headers: {
				"x-user-agent": `spicetify v${Spicetify.Config.version} (https://github.com/spicetify/cli)`,
			},
		});

		if (body.status === 200) return await body.json();

		// Album editions and featured artists can differ between the databases.
		// Match the same artist/title, then prefer the closest track duration.
		const normalize = (value) => String(value || "")
			.replace(/&amp;/g, "&").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
			.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
		const artist = String(info.artist || "").split(/,| feat\.? | ft\.? /i)[0].trim();
		const query = new URLSearchParams({ track_name: info.title, artist_name: artist });
		const response = await fetch(`https://lrclib.net/api/search?${query}`, {
			headers: { "x-user-agent": `spicetify v${Spicetify.Config.version} (https://github.com/spicetify/cli)` },
		});
		if (!response.ok) return { error: "Request error: Track wasn't found", uri: info.uri };
		const candidates = (await response.json()).filter(candidate =>
			normalize(candidate.trackName) === normalize(info.title) &&
			normalize(candidate.artistName) === normalize(artist) &&
			(!Number.isFinite(durr) || Math.abs(candidate.duration - durr) <= 3) &&
			(candidate.syncedLyrics || candidate.plainLyrics || candidate.instrumental)
		);
		candidates.sort((a, b) =>
			(Number.isFinite(durr) ? Math.abs(a.duration - durr) - Math.abs(b.duration - durr) : 0) ||
			Number(!!b.syncedLyrics) - Number(!!a.syncedLyrics)
		);
		return candidates[0] || { error: "Request error: Track wasn't found", uri: info.uri };
	}

	function getUnsynced(body) {
		const unsyncedLyrics = body?.plainLyrics;
		const isInstrumental = body.instrumental;
		if (isInstrumental) return [{ text: "♪ Instrumental ♪" }];

		if (!unsyncedLyrics) return null;

		return Utils.parseLocalLyrics(unsyncedLyrics).unsynced;
	}

	function getSynced(body) {
		const syncedLyrics = body?.syncedLyrics;
		const isInstrumental = body.instrumental;
		if (isInstrumental) return [{ text: "♪ Instrumental ♪" }];

		if (!syncedLyrics) return null;

		return Utils.parseLocalLyrics(syncedLyrics).synced;
	}

	return { findLyrics, getSynced, getUnsynced };
})();
