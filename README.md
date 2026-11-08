# STEP Onboarding — Red Light, Green Light

A multiplayer Red Light, Green Light game for the SPRINT-STEP onboarding.

- **Big screen:** open the game link on the projector laptop and choose **Host the game**.
- **Players:** scan the QR code on the big screen, type a name, pick Boy or Girl, and tap **Join**. No login needed.
- Up to 25 players. The first 3 across the safe line win.

The live connection between the big screen and the phones runs on Supabase Realtime
(project "Online Games", see `config.js`). No database tables are used.

Hosted with GitHub Pages: every push to `main` publishes the site automatically
(Settings → Pages → Source: **GitHub Actions**).

## STEP RUN 10K

A 10K tap-to-run race (`burnout.html`). Pick it on the home page, then Host or Join.
The big screen shows a QR code; players join from their phones and tap to run. Up to 20 lanes
(phones, keyboard players on the big screen, and computer runners). Uses the same Supabase
Realtime connection as the other games (broadcast only, no database tables).

## STEP MATA-MATAYA

A Filipino tag game between little people in a subdivision maze (`chomp.html`). Pick it on the home page, then Host or Join.
Up to 25 players (phones, one keyboard player on the big screen, and computer players). A round lasts 3 minutes.

- One player is the taya (red shirt, pulsing red ring) and chases everyone else. When the taya touches a runner, that runner becomes the new taya.
- The player who just stopped being taya is safe for 5 seconds: the new taya cannot tag them back.
- Only the taya can DASH (drag the button to aim, 10 second cooldown). The taya also sees a wider part of the map and is slightly faster.
- Score = seconds running minus seconds as taya. The most points wins; the team with the best average wins the team ranking.
- Phones have an analog joystick: your player only moves while you push it, and stops when you let go. A phone only shows what fits on its own screen.
  Each phone moves its own player and only sends a message when the joystick changes or it dashes;
  the big screen sends fewer updates when more phones are in, so the game stays inside the free Supabase Realtime limit.
