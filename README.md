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

## STEP ICE-ICE WATER

Filipino freeze tag with an objective (`ice.html`), on the same map and with the same controls as Mata-mataya. Pick it on the home page, then Host or Join.
Up to 25 players. A round lasts 3 minutes.

- Three players are the tayas for the whole round with 8 or more players (two with 5 to 7, one with fewer). With three, one guards the bomb, one guards the flag and one just chases the runners; with two, one guards the bomb and one chases. Each taya's phone shows their job. A runner touched by a taya is frozen and cannot move until another runner touches them.
- The bomb sits in the middle of the basketball court. A runner who stays touching it for 5 seconds in a row defuses it and the runners win; standing near it is not enough. Moving away or being frozen starts the count over.
- Runners can JUMP: a runner in the air cannot be frozen, but they can be touched as soon as they land. Tayas stumble (fall for 2 seconds, cannot freeze) when they bump into each other, the same way runners do.
- A frozen player is drawn in black and white inside a thin ice outline.
- A red flag stands at a random spot far from the bomb (a different spot every round). A runner who touches it for 2 seconds in a row knocks it down, and while it is down the tayas cannot freeze anyone. A taya who touches the fallen flag for 2 seconds raises it again. Only the tayas are shown where the flag is (arrow and mini-map marker); runners see it only when it is on their screen, and it is not drawn on the big screen.
- The tayas' dash is 20% slower than in Mata-mataya.
- Movement smoothness: the big screen sends phones a fixed number of updates per second shared between all players (the realtime service allows about 100 messages a second on the free plan). Phones stamp and carry every update forward by how late it arrived and ease small corrections in, so other players glide instead of jumping. On a paid Supabase plan, open the big screen with `&budget=400` at the end of its address to allow more updates a second.
- The tayas win when every runner is frozen, or when the time runs out with the bomb still armed.
- The ice takes 2 seconds to set before a runner can be freed, and a freed runner cannot be frozen again for 2 seconds.
- Points: runners get 1 per second free, 25 per runner freed and 100 for defusing; tayas get 15 per freeze; everyone on the winning side gets 100.
