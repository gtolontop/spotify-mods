/// <reference path="../@types/spicetify.d.ts" />

/**
 * @author CharlieS1103
 */

(function songstats() {
	const { CosmosAsync, ContextMenu, URI } = Spicetify;
	if (!(CosmosAsync && URI && ContextMenu && Spicetify.Locale && Spicetify.PopupModal)) {
		setTimeout(songstats, 300);
		return;
	}
	let local_language = Spicetify.Locale._locale;
	const translation = {
		en: {
			titletxt: "Song Stats",
			buttontxt: "View Song Stats",
			danceability: "Danceability",
			energy: "Energy",
			key: "Key",
			loudness: "Loudness",
			speechiness: "Speechiness",
			acousticness: "Acousticness",
			instrumentalness: "Instrumentalness",
			liveness: "Liveness",
			valence: "Valence",
			tempo: "Tempo",
			popularity: "Popularity",
			releaseDate: "Release Date",
			label: "Record Label",
			genres: "Genres",
			unknown: "Unknown"
		},
		fr: {
			titletxt: "Statistique de la musique",
			buttontxt: "Voir les statistique de la musique",
			danceability: "Capacité à danser",
			energy: "Énergie",
			key: "Tonalité",
			loudness: "Intensité sonore",
			speechiness: "Élocution",
			acousticness: "Acoustique",
			instrumentalness: "instrumentalité",
			liveness: "vivacité",
			valence: "Mood",
			tempo: "Tempo",
			popularity: "Popularité",
			releaseDate: "Date de sortie",
			label: "Label",
			genres: "Genres",
			unknown: "Inconnu"
		},
		"fr-CA": {
			titletxt: "Statistique de la musique",
			buttontxt: "Voir les statistique de la musique",
			danceability: "Capacité à danser",
			energy: "Énergie",
			key: "Tonalité",
			loudness: "Intensité sonore",
			speechiness: "Élocution",
			acousticness: "Acoustique",
			instrumentalness: "instrumentalité",
			liveness: "vivacité",
			valence: "Mood",
			tempo: "Tempo",
			popularity: "Popularité",
			releaseDate: "Date de sortie",
			label: "Label",
			genres: "Genres",
			unknown: "Inconnu"
		},
		cs: {
			titletxt: "Statistiky písně",
			buttontxt: "Zobrazit statistiky písně",
			danceability: "Tančitelnost",
			energy: "Energie",
			key: "Tónina",
			loudness: "Hlasitost",
			speechiness: "Mluvenost",
			acousticness: "Akustičnost",
			instrumentalness: "Nástrojovost",
			liveness: "Živost",
			valence: "Emoční náboj",
			tempo: "Tempo",
			popularity: "Popularita",
			releaseDate: "Datum vydání",
			label: "Vydavatelství",
			genres: "Žánry",
			unknown: "Neznámé"
		},
		de: {
			titletxt: "Songstatistiken",
			buttontxt: "Songstatistiken anzeigen",
			danceability: "Tanzbarkeit",
			energy: "Energie",
			key: "Tonart",
			loudness: "Lautstärke",
			speechiness: "Sprechanteil",
			acousticness: "Akustik",
			instrumentalness: "Instrumentalität",
			liveness: "Lebendigkeit",
			valence: "Stimmung",
			tempo: "Tempo",
			popularity: "Beliebtheit",
			releaseDate: "Veröffentlichungsdatum",
			label: "Plattenlabel",
			genres: "Genres",
			unknown: "Unbekannt"
		},
		es: {
			titletxt: "Estadísticas de la canción",
			buttontxt: "Ver estadísticas de la canción",
			danceability: "Bailable",
			energy: "Energía",
			key: "Tono",
			loudness: "Volumen",
			speechiness: "Habla",
			acousticness: "Acústica",
			instrumentalness: "Instrumental",
			liveness: "Vivacidad",
			valence: "Estado de ánimo",
			tempo: "Tempo",
			popularity: "Popularidad",
			releaseDate: "Fecha de lanzamiento",
			label: "Sello discográfico",
			genres: "Géneros",
			unknown: "Desconocido"
		},
	};

	try {
		translation[local_language].buttontxt;
	} catch {
		local_language = "en";
	}

	const titletxt = translation[local_language].titletxt;
	const buttontxt = translation[local_language].buttontxt;
	const danceability = translation[local_language].danceability;
	const energy = translation[local_language].energy;
	const key = translation[local_language].key;
	const loudness = translation[local_language].loudness;
	const speechiness = translation[local_language].speechiness;
	const acousticness = translation[local_language].acousticness;
	const instrumentalness = translation[local_language].instrumentalness;
	const liveness = translation[local_language].liveness;
	const valence = translation[local_language].valence;
	const tempo = translation[local_language].tempo;
	const popularity = translation[local_language].popularity;
	const releaseDate = translation[local_language].releaseDate;
	const label = translation[local_language].label;
	const genres = translation[local_language].genres;
	const unknown = translation[local_language].unknown;

	//Watch for when the song is changed

	async function getSongStats(uris) {
		const uri = uris[0];
		const uriFinal = uri.split(":")[2];
		const getJSON = Spicetify.PluginHTTP.getJSON;
		const features = await getJSON(`https://api.spotify.com/v1/audio-features/${uriFinal}`).catch(() => ({}));
		const analysis = await Spicetify.getAudioData(uri).catch(() => ({}));
		const res = { ...analysis.track, ...features };
		let resTrack = await getJSON(`https://api.spotify.com/v1/tracks/${uriFinal}`).catch(() => null);
		if (!resTrack) {
			const item = Spicetify.Player.data?.item;
			if (item?.uri !== uri) {
				Spicetify.showNotification("Spotify ne fournit pas les informations de ce morceau pour le moment.", true);
				return;
			}
			const meta = item.metadata || {};
			resTrack = {
				popularity: null,
				album: { id: meta.album_uri?.split(":")[2], release_date: meta.album_release_date || meta.release_date || unknown },
				artists: [{ id: meta.artist_uri?.split(":")[2] }],
			};
		}
		
		// Fetch full album details to get label and potentially album genres
		const albumId = resTrack.album.id;
		const resAlbum = albumId ? await getJSON(`https://api.spotify.com/v1/albums/${albumId}`).catch(() => ({})) : {};
		
		// Fetch artist data as fallback for genres
		const artistId = resTrack.artists?.[0]?.id;
		const resArtist = artistId ? await getJSON(`https://api.spotify.com/v1/artists/${artistId}`).catch(() => ({})) : {};

		const formatPercent = value => Number.isFinite(value) ? Math.round(100 * value) : unknown;
		const pitchClasses = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];

		let keyText = res.key;
		if (!Number.isInteger(res.key) || res.key < 0 || res.key >= pitchClasses.length) {
			keyText = unknown;
		} else {
			const pitchClassIndex = res.key;
			keyText = pitchClasses[pitchClassIndex];
		}

		// Get the label from album data
		const labelName = resAlbum.label || unknown;
		
		// First try to get genres from album, then fall back to artist genres
		let genresList = [];
		if (resAlbum.genres && resAlbum.genres.length > 0) {
			genresList = resAlbum.genres;
		} else if (resArtist.genres && resArtist.genres.length > 0) {
			genresList = resArtist.genres;
		}
		
		const genresText = genresList.length > 0 ? 
			genresList.map(genre => genre.charAt(0).toUpperCase() + genre.slice(1)).join(", ") : 
			unknown;

		Spicetify.PopupModal.display({
			title: `${titletxt}`,
			content: `<style>
                    .stats-table {
                        display: table;
                        width: 100%;
                        border-collapse: collapse;
                        background: var(--spice-background);
                    }

                    .stats-row {
                        display: table-row;
                    }

                    .main-type-alto {
                      color: var(--spice-text);
                    }

                    .stats-cell {
                        display: table-cell;
                        padding: 2px;
                        font-weight: 550;
                        color: var(--spice-text);
                    }
                    .stats-cell:nth-child(even) {
                      font-weight: 400;
                </style>
                <div class="stats-table">
                    <div class="stats-row">
                        <div class="stats-cell">${danceability}:&nbsp;</div>
                        <div class="stats-cell">${formatPercent(res.danceability)}&nbsp;%</div>
                    </div>
                    <div class="stats-row">
                        <div class="stats-cell">${energy}:&nbsp;</div>
                        <div class="stats-cell">${formatPercent(res.energy)}&nbsp;%</div>
                    </div>
                    <div class="stats-row">
                        <div class="stats-cell">${key}:&nbsp;</div>
                        <div class="stats-cell">${keyText}</div>
                    </div>
                    <div class="stats-row">
                        <div class="stats-cell">${loudness}:&nbsp;</div>
                        <div class="stats-cell">${res.loudness ?? unknown}&nbsp;dB</div>
                    </div>
                    <div class="stats-row">
                        <div class="stats-cell">${speechiness}:&nbsp;</div>
                        <div class="stats-cell">${formatPercent(res.speechiness)}&nbsp;%</div>

                    </div>
                    <div class="stats-row">
                        <div class="stats-cell">${acousticness}:&nbsp;</div>
                        <div class="stats-cell">${formatPercent(res.acousticness)}&nbsp;%</div>
                    </div>
                    <div class="stats-row">
                        <div class="stats-cell">${instrumentalness}:&nbsp;</div>
                        <div class="stats-cell">${formatPercent(res.instrumentalness)}&nbsp;%</div>
                    </div>
                    <div class="stats-row">
                        <div class="stats-cell">${liveness}:&nbsp;</div>
                        <div class="stats-cell">${formatPercent(res.liveness)}&nbsp;%</div>
                    </div>
                    <div class="stats-row">
                        <div class="stats-cell">${valence}:&nbsp;</div>
                        <div class="stats-cell">${formatPercent(res.valence)}&nbsp;%</div>
                        </div>
                    <div class="stats-row">
                        <div class="stats-cell">${tempo}:&nbsp;</div>
                        <div class="stats-cell">${res.tempo ?? unknown} BPM</div>
                    </div>
                    <div class="stats-row">
                        <div class="stats-cell">${popularity}:&nbsp;</div>
                        <div class="stats-cell">${resTrack.popularity ?? unknown}&nbsp;%</div>
                        </div>
                    <div class="stats-row">
                        <div class="stats-cell">${releaseDate}:&nbsp;</div>
                        <div class="stats-cell">${resTrack.album.release_date}</div>
                    </div>
                    <div class="stats-row">
                        <div class="stats-cell">${label}:&nbsp;</div>
                        <div class="stats-cell">${labelName}</div>
                    </div>
                    <div class="stats-row">
                        <div class="stats-cell">${genres}:&nbsp;</div>
                        <div class="stats-cell">${genresText}</div>
                    </div>
                </div>`,
		});
	}

	const shouldDisplayContextMenu = (uris) => {
		if (uris.length > 1) return false;
		const uri = uris[0];
		const uriObj = Spicetify.URI.fromString(uri);
		if (uriObj.type === Spicetify.URI.Type.TRACK) return true;
		return false;
	}

	const statsIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="main-contextMenu-menuItemIcon">
		<path d="M18 20V10"></path>
		<path d="M12 20V4"></path>
		<path d="M6 20v-6"></path>
	</svg>`;

	const cntxMenu = new ContextMenu.Item(
		buttontxt,
		getSongStats, 
		shouldDisplayContextMenu,
		statsIcon
	);
	cntxMenu.register();
})();
