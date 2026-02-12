# Scrolly Article: Tchoumi/Epstein Protokoll

Statisches Projekt (HTML/CSS/JS) mit Intro-Teil und Scrolly-Nachrichtenverlauf.

## Struktur

- `index.html` / `styles.css` / `app.js`: Frontend
- `content/article.txt`: Rohtext
- `scripts/parse-article.js`: Parser Rohtext -> `data/messages.json`
- `scripts/build-previews.sh`: PDF -> JPG Previews in `assets/previews/`
- `scripts/build-image-map.js`: erzeugt `data/image-map.json` aus vorhandenen Previews
- `data/messages.json`: normalisierte Steps
- `data/image-map.json`: `message_id -> image paths`
- `Tchoumi/`: Original-PDFs

## Daten neu bauen

```bash
node scripts/parse-article.js
bash scripts/build-previews.sh
node scripts/build-image-map.js
```

## Lokal starten

```bash
python3 -m http.server 8080
```

Dann im Browser: `http://localhost:8080`

## Mapping später feinsteuern

Aktuell mappt `build-image-map.js` automatisch auf vorhandene Preview-Dateien je Message.

Für kuratierte Zuordnung später:
1. `data/image-map.json` manuell editieren.
2. Pro Key (`msg-001`, `msg-002`, ...) gewünschte Bilder als Array setzen.

Beispiel:

```json
{
  "msg-001": ["assets/previews/EFTA02413831.jpg"],
  "msg-002": ["assets/previews/EFTA01796045.jpg"]
}
```
