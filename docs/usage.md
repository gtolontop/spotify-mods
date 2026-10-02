# Commandes

Depuis la racine du dépôt :

```powershell
# Installer ou réparer
.\scripts\Install.ps1

# Mettre à jour depuis Git
.\scripts\Update.ps1

# Restaurer la dernière sauvegarde
.\scripts\Restore.ps1

# Vérifier les fichiers et la syntaxe
.\scripts\Validate.ps1

# Activer les diagnostics
.\scripts\Install.ps1 -Diagnostics
python .\tools\read-diagnostics.py
```

Les sauvegardes sont dans `%APPDATA%\spicetify\ManagedBackups`.

Pour les diagnostics, attendre environ 20 secondes après l'ouverture de Spotify. Relancer `Repair.cmd` pour les désactiver.

Les autres versions de Spotify et Spicetify doivent être vérifiées avant de modifier `manifest.json`. Certaines statistiques et paroles dépendent de la disponibilité des services utilisés.
