# Nomada Tickets — QR Scanner

Door scanner app for Nomada Tickets events.

## How it works
1. Door staff opens the scanner URL on their phone
2. Enters a 4-digit PIN
3. Points camera at guests' QR codes
4. Blue = accepted male, Pink = accepted female, Red = rejected

## Development
1. Update `js/config.js` — set `BACKEND_URL` to `http://localhost:3000`
2. Open `index.html` with Live Server (or any local server)
3. Make sure the backend is running with `SCANNER_PIN` set in `.env`

## Deployment
1. Push to GitHub
2. Connect repo to Cloudflare Pages
3. Build command: (none)
4. Output directory: `.` or `/`
5. Custom domain: `scanner.nomadatickets.com`

## Backend Requirements
- `POST /api/scanner/auth` — PIN verification
- `GET /api/scanner/tickets` — Fetch all valid tickets
- `POST /api/scanner/scan` — Mark ticket as scanned
- Environment variables: `SCANNER_PIN`, `SCANNER_ORIGIN`