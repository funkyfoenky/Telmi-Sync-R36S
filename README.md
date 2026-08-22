# Telmi Sync for R36S

Application de bureau (Electron) pour synchroniser histoires, musique et jeux avec **TelmiOS** sur console **R36S** (et Miyoo Mini).

Fork de [Telmi Sync](https://github.com/DantSu/Telmi-Sync) (v0.18.0) avec :

- Modes plateforme **Miyoo** / **R36S** (paramètres Telmi Sync)
- Onglet **Jeux** (R36S) : ROMs, jaquettes, contrôles émulation
- **CardMaker R36S** : flash GPT Windows natif (sans WSL)
  - Image téléchargée depuis [Telmi-Story-Teller-R36S](https://github.com/funkyfoenky/Telmi-Story-Teller-R36S/releases)
  - Script embarqué : `extraResources/r36s/flash-telmi-sd-win.ps1`
  - Restauration `autorun.inf` après expand TELMI
- Sélection **REV console** (V20 / V30 Panel4) depuis l’UI SD  
  (`revs.json` + DTB embarqués dans `extraResources/r36s/boot/`)

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

Sortie : `electron/dist/Telmi Sync Setup <version>.exe`  
Publier l’installateur en **GitHub Release** (ne pas committer `electron/dist` ni un dossier `release/`).

## Ressources R36S embarquées

```
extraResources/r36s/
  flash-telmi-sd-win.ps1      # flash image + expand TELMI
  Select-Telmi-REV.ps1        # CLI équivalent à l’UI REV
  content/autorun.inf         # seed TELMI (détection Telmi Sync)
  boot/revs.json              # catalogue REV
  boot/dtb/*.dtb              # DTB V20 / V30 Panel4
```

## Licence

Voir `LICENSE`.
