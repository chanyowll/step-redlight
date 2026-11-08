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

## STEP CHOMP

A Pac-Man style chase in a subdivision maze (`chomp.html`). Pick it on the home page, then Host or Join.
Up to 25 players (phones, one keyboard player on the big screen, and computer players). A round lasts 3 minutes.

- Players are split at random into 3 to 5 equal colour groups. Each colour eats one colour and is eaten by another.
- Prey: eat when your level is equal or higher. Other colours: eat when your level is higher. Your predator: only when you are 2+ levels higher.
- Every eat levels you up (bigger and a bit slower). Level 3 unlocks DASH (drag the button to aim); from level 4 you no longer fit through alleys and park paths.
- Eaten players come back after 3 seconds, one level lower. Pandesal gives XP, KAPE lets you eat your predator colour for 6 seconds, and the last 30 seconds are a brownout (less vision, double points).
- Phones only show what their player can see. Each phone moves its own player and only sends a message when it turns or dashes;
  the big screen sends fewer updates when more phones are in, so the game stays inside the free Supabase Realtime limit.
