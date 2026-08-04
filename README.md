# Telmi Sync for R36S

Application de bureau (Electron) pour synchroniser histoires, musique et jeux avec **TelmiOS** sur **R36S** (et Miyoo).

Fork de [Telmi Sync](https://github.com/LeGoffMael/Telmi-Sync) avec :

- Mode plateforme **Miyoo** / **R36S**
- Onglet **Jeux** (R36S) : ROMs, jaquettes, contrôles émulation, combo menu caché
- CardMaker R36S : flash GPT (BOOT / root / TELMI) via `flash-telmi-sd.ps1`
- Mapping boutons aligné silkscreen R36S (A = bas, B = droite)

## Prérequis

- Node.js 18+
- Windows (CardMaker R36S et flash SD)

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

## Release fournie

Voir le dossier `release/` (à publier en **GitHub Release**, pas à committer dans git).

## Licence

Voir `LICENSE`.
