# Zenelőjatszó – GitHub Pages (mappa nélkül)

Ez a projekt **100% statikus**, GitHub Pages-en fut (nincs backend).  
Az **admin felület** GitHub API-n keresztül **commitolja** a zenéket és a `tracks.json`-t a repóba.

## Használat (GitHub Pages)
1. Töltsd fel **az összes fájlt a repó gyökerébe** (nincs mappa).
2. Repo → Settings → Pages → Deploy from a branch
   - Branch: `main`
   - Folder: `/ (root)`
3. Nyisd meg:
   - User: `https://<user>.github.io/<repo>/`
   - Admin: `https://<user>.github.io/<repo>/admin.html`

## Admin beállítás
Az admin oldalon add meg:
- Owner (felhasználó vagy org)
- Repo név
- Branch (általában `main`)
- GitHub Token (fine-grained PAT)
  - Permission: **Contents: Read and write** (csak erre a repóra)

## Frissülés
A user oldal 2.5 mp-enként újratölti a `tracks.json`-t cache-bypass-szal, így a változások gyorsan megjelennek.

## Fájlnevek
A feltöltött fájlok a repó gyökerébe mennek, pl.:
- `track__<id>.mp3`
- `cover__<id>.jpg`

> Tipp: nagy mp3-oknál a GitHub limitbe futhatsz (file size / repo size). Ha sok és nagy zenét akarsz, akkor inkább külső tárhely (pl. Cloudflare R2, S3) – de ez már nem “csak GitHub Pages”.
