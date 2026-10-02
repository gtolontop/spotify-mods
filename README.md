# Spotify Mods

Pack personnel de plugins corrigés, conservé dans un dépôt privé. Toutes les modifications du pack partent de ce dossier, puis sont installées dans Spicetify.

## Utiliser le pack

- **Repair.cmd** réinstalle les versions corrigées et crée une sauvegarde avant de modifier les plugins.
- **Update.cmd** récupère les changements de ce dépôt avec Git, puis installe le pack.
- **F11** ouvre Full App Display. Les boutons micro donnent accès à Spicy Lyrics et Lyrics Plus.
- Le chat Oneko, Shuffle+, Loopy Loop, Song Stats et Adblockify sont inclus.

Versions de référence : **Spotify 1.3.1.234**, **Spicetify 2.45.1**. Une nouvelle version Spotify doit être vérifiée avant de modifier la version prise en charge dans `manifest.json`. L'installateur refuse une version non validée.

La tâche Spicetify déjà présente sur ce PC est reliée au contrôleur du dépôt : au démarrage, il répare les fichiers du pack seulement s'ils ont changé ou si l'injection a disparu. Il ne télécharge pas de nouvelles versions de plugins au hasard.

## Sauvegardes et retour arrière

Les configurations, plugins et réglages locaux sont sauvegardés dans `%APPDATA%\spicetify\ManagedBackups`. Ces sauvegardes restent sur le PC et ne sont pas envoyées sur GitHub.

Pour revenir à la dernière sauvegarde :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Restore.ps1
```

Le pack conserve les fichiers exécutables officiels signés de Spotify. Il ne modifie pas `Spotify.exe`, `Spotify.dll` ou `chrome_elf.dll`, et ne configure pas d'exclusions antivirus. L'installation vérifie leurs signatures et leurs empreintes avant et après l'application des plugins.

## Corrections locales

- Spicy Lyrics 6.3.98 : l'infobulle optionnelle ne provoque plus un plantage au démarrage. La version corrigée est locale et ne se remplace pas par le chargeur automatique du fournisseur.
- API URI : adaptation à l'interface native Spotify 1.3.1 pour rétablir Shuffle+ et les menus Song Stats.
- HTTP Spotify : remplacement des requêtes HTTP devenues incompatibles avec Cosmos ; prise en compte de la limitation serveur 429.
- Song Stats : analyse audio Spotify comme source de secours et affichage des données disponibles sans valeurs `NaN`.
- Lyrics Plus : recherche de secours LRCLIB lorsque l'album ou les artistes invités empêchent une correspondance exacte ; vérification du titre, de l'artiste et de la durée.
- Oneko : infobulles facultatives.
- Personnalisation de la barre latérale désactivée pour éviter une erreur React de Spicetify.
- Adblockify : version actuelle de la source amont, chargée comme extension JavaScript.

Certaines données Song Stats dépendent des limites du serveur Spotify. Les tests de démarrage ne garantissent pas la disponibilité de paroles pour chaque morceau ni de chaque statistique.

## Diagnostiquer

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Install.ps1 -Diagnostics
python .\tools\read-diagnostics.py
```

Attendre environ 20 secondes après l'ouverture de Spotify. Le lecteur ne renvoie que la clé de diagnostic du pack. Relancer `Repair.cmd` pour désactiver les diagnostics.

## Maintenance

Modifier les sources ici, vérifier les scripts et les plugins dans Spotify, puis committer et pousser les corrections. Ne pas remplacer les fichiers natifs par un patch SpotX. Ne pas copier de profils Spotify, jetons, cookies, diagnostics ou sauvegardes dans ce dépôt.

`scripts/Validate.ps1` vérifie les fichiers du manifeste et la syntaxe des scripts. L'installateur l'exécute avant chaque réparation ou mise à jour ; les contrôles dans Spotify restent nécessaires pour valider une nouvelle version.

GitHub Actions n'a pas pu démarrer les tâches lors de la publication initiale (`startup_failure`, aucun job créé). Le pack utilise donc les vérifications locales avant installation et ne dépend pas d'une CI distante.

Les sources tierces et leurs licences sont indiquées dans [THIRD_PARTY.md](THIRD_PARTY.md).
