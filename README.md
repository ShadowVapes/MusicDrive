# Zenelejátszó (admin feltöltés + realtime frissülés)

Egy modern, mobilbarát zenelejátszó oldal (Spotify-szerű UI) admin felülettel:
- MP3 feltöltés + borítókép
- Cím + kiadó(k)/előadó(k)
- YouTube / Spotify link beillesztés → **azonnali** automatikus kitöltés (gomb nélkül)
- Admin oldalon **autosave** (automatikus mentés)
- Felhasználói felület **realtime** frissül (Socket.IO), ha admin oldalon változás történik

## Gyors indulás (dev)

### 1) Követelmények
- Node.js **18+**

### 2) Telepítés
```bash
npm install
```

### 3) Futtatás
```bash
npm run dev
```
- Client: http://localhost:5173
- Server: http://localhost:3001

## Build + production futtatás
```bash
npm run build
npm start
```
Production módban a szerver kiszolgálja a `client/dist` tartalmát is.

## Mappák
- `client/` – React + Vite + Tailwind UI
- `server/` – Express API + feltöltések + LowDB JSON adatbázis + Socket.IO

## Megjegyzések
- Jelenleg nincs beépített autentikáció az admin oldalra (helyi / privát használatra készült). Ha szeretnél jelszót, egyszerűen hozzáadunk egy middleware-t (pl. `ADMIN_PASSWORD`).

---
MIT License
