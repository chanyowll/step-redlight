# STEP Onboarding — Red Light, Green Light

A multiplayer Red Light, Green Light game for the SPRINT-STEP onboarding.

- **Big screen:** open the game link on the projector laptop and choose **Host the game**.
- **Players:** scan the QR code on the big screen, type a name, pick Boy or Girl, and tap **Join**. No login needed.
- Up to 25 players. The first 3 across the safe line win.

The live connection between the big screen and the phones runs on Supabase Realtime
(project "Online Games", see `config.js`). No database tables are used.

Hosted with GitHub Pages: every push to `main` publishes the site automatically
(Settings → Pages → Source: **GitHub Actions**).

## Burnout 10K

A 10K tap-to-run race (`burnout.html`). Pick it on the home page, then Host or Join.
The big screen shows a QR code; players join from their phones and tap to run. Up to 20 lanes
(phones, keyboard players on the big screen, and computer runners). Uses the same Supabase
Realtime connection as the other games (broadcast only, no database tables).
