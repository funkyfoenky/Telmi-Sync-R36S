# Telmi Sync for R36S

Application de bureau (Electron) pour synchroniser histoires, musique et jeux avec **TelmiOS** sur console **R36S** (et Miyoo Mini).

Fork de [Telmi Sync](https://github.com/DantSu/Telmi-Sync) avec :

- Modes plateforme **Miyoo** / **R36S** (paramètres Telmi Sync)
- Onglet **Jeux** (R36S) : ROMs, jaquettes, contrôles émulation
- **CardMaker R36S** : flash Windows natif (GPT V20 / MBR Other) (sans WSL)
  - Choix **V20** ou **Other / Autres modèles** (deux dépôts d’images GitHub)
  - Layout **Mono SD** (OS + contenu) ou **Multi SD** (SD OS puis SD contenu)
  - Multi SD : suppression de la partition TELMI sur la SD OS après flash
  - Scripts embarqués : `flash-telmi-sd-win.ps1`, `prepare-content-sd.ps1`, `telmi-sd-common.ps1`
  - Restauration `autorun.inf` après expand TELMI
- **Sélection DTB** (images Other uniquement) depuis l’UI
  - Catalogue `consoles/` sur la partition BOOT (ArkOS4Clone)
  - Script `extraResources/r36s/dtb-selector/Select-SoysauceDTB.ps1`
  - Pas de sélection DTB sur images **V20** (DTB déjà inclus)

## Images GitHub

| Profil | Dépôt | Usage |
|--------|-------|-------|
| **V20** | [Telmi-Story-Teller-R36S-V20](https://github.com/funkyfoenky/Telmi-Story-Teller-R36S-V20/releases) | Flash direct, sans choix DTB |
| **Other** | [Telmi-Story-Teller-R36S-Main](https://github.com/funkyfoenky/Telmi-Story-Teller-R36S-Main/releases) | Flash + sélection modèle console |

Dernière release **stable** publiée (draft / pre-release ignorés).

## Prérequis

- Node.js 18+
- Windows 10+ (flash SD / CardMaker R36S)

## Développement

```bash
npm install
npm start
```

## Build installateur Windows

```bash
npm run build
```

Sortie : `electron/dist/Telmi Sync R36 Setup 0.18.5.exe`  
Publier l’installateur en **GitHub Release** (ne pas committer `electron/dist` ni un dossier `release/`).

## Ressources R36S embarquées

```
extraResources/r36s/
  flash-telmi-sd-win.ps1           # flash from-image / os-only (supprime p3+ en multi) + expand TELMI
  prepare-content-sd.ps1           # préparation SD contenu (mode multi)
  telmi-sd-common.ps1              # helpers partagés
  dtb-selector/
    Select-SoysauceDTB.ps1         # apply DTB (mode Other)
    boot.ini.template
  Select-Telmi-REV.ps1             # CLI legacy REV
  content/autorun.inf              # seed TELMI (détection Telmi Sync)
  boot/revs.json                   # fallback legacy REV
  boot/dtb/*.dtb
```

## Licence

Voir `LICENSE`.
