# The Odyssey — Journey Home

A browser-based **hybrid adventure game** adapted from **Group D's original Odyssey game script**.

**Play through the prologue and all 18 locations**, beginning with Telemachus in Ithaca and ending with Odysseus' homecoming. Each chapter includes a walkable illustrated level, a main quest, original scripted story moments, and (where written) an optional side quest.

## Play

Once GitHub Pages is enabled, visit **https://evankaparekh.github.io/odyssey-adventure/**.

To try it locally, run a small web server in the repository directory:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`. Opening `index.html` directly as a `file://` page will not load `story.json` in most browsers.

## Controls

| Control | What it does |
| --- | --- |
| W / A / S / D or arrow keys | Walk around the current level |
| Click/tap a destination | Walk toward it |
| E or the gold Interact button | Interact with a nearby marker |
| Enter / Space | Continue story dialogue |
| Purple marker | Discover an optional side quest |
| Gold numbered marker | Complete the next main quest objective |
| Ship marker | Sail to the next location after completing the main objectives |
| Story Journal | Read Group D's full original script for any reached chapter |
| Voyage Map | See where you've been and where you're heading |

Progress is stored in **this browser's localStorage**. No accounts, tracking, or external game engine are required. Sound effects are off by default and optional.

## Locations

0. Prologue — Ithaca (Telemachus)
1. Troy
2. Ismaros — Land of the Cicones
3. The Open Sea
4. Land of the Lotus-Eaters
5. Island of the Cyclopes
6. Polyphemus' Cave
7. Aeolia
8. Telepylos — Land of the Laestrygonians
9. Aeaea — Circe's Island
10. Land of the Cimmerians
11. The Underworld
12. Return to Aeaea
13. Island of the Sirens
14. Scylla and Charybdis
15. Thrinacia — Cattle of Helios
16. Ogygia — Calypso's Island
17. Scheria — Land of the Phaeacians
18. Ithaca — The King Returns

## Files

- `index.html`: menus, exploration layout, dialogue and journal panels
- `style.css`: responsive ancient Greek-inspired UI
- `game.js`: canvas exploration, interactions, quest progression, scenes, saving, map
- `story.json`: parsed quest metadata **and the complete text of Group D's script**

## Publish on GitHub Pages

1. Go to **Settings → Pages** in this repository.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select **main** and **/(root)**.
4. Click **Save**. When GitHub finishes publishing, open the Play link above.

## Original source

Adapted from the Google Doc [Group Adaptation Project Group D](https://docs.google.com/document/d/1oUWR0-QxiRizolJwylN0_jx_Ij_MmbXgL5miQ3B-AxI/edit). Story dialogue and location ordering come from that collaborative script. Additional game interface and mechanics make it playable in a browser.

Developed as a creative literature adaptation project, not a commercial game.
