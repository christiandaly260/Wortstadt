# 🚇 Wortstadt

A German vocab game for getting from B1 to C1. You learn Munich one district at a time: each district is a U-Bahn line, each station a short themed lesson, and every line ends with a boss.

## Run it

```bash
npm install      # first time only
npm run dev      # → http://localhost:5173
npm run dev -- --host   # also playable on your phone over the same Wi-Fi
npm test         # answer-checker tests
```

Pushing to `main` deploys to GitHub Pages automatically (enable it once under **Settings → Pages → Source: GitHub Actions**).

## How a district plays

1. **Scene**: a short dialogue introduces about 8 words in context. Tap a highlighted word to see its card.
2. **Encounters**: 3–4 quick rounds per station:
   - **Artikel-Regen**: sort falling nouns into der / die / das (nouns from earlier stations come back too)
   - **Lückentext**: type the word in the right form into a real sentence
   - **Kollokation**: pick the verb that goes with the noun (*einen Antrag stellen*)
   - **Gespräch**: pick the reply that is correct *and* in the right register
   - **Wortschmiede**: build words from prefix + root + suffix tiles
3. **Patience**: each character has a patience meter, and mistakes cost a point. When it runs out you get sent away and retry the station.
4. **Boss**: a timed, realistic task that pulls in the whole pack, plus any words you missed along the way.
5. **Stars**: ★ clear the boss · ★★ clear it without mistakes · ★★★ pass the Amtsdeutsch (register) challenge.
6. **Fog**: words come back on a spaced-repetition schedule (1, 3, 7, 16, 40 days). Overdue words fog the district on the map, and a quick review clears it.

7. **XP and ranks**: every correct answer earns XP (more on a combo), plus bonuses for stations, bosses and the bonus round. You climb from Tourist to Stadtlegende. A daily streak counts the days in a row you've played.

Typed answers accept `ae/oe/ue/ss` for `ä/ö/ü/ß`. Small typos pass with a note. A wrong article or ending counts as a near miss, which gets you one retry.

Progress is saved in your browser's localStorage.

## Adding a district

All content lives in `src/data/districts/*.json`, with no code needed:

- `words`: each word has `de`, `article`, `plural`, `en`, `example`, and `cloze` if the example uses an inflected form
- `stations`: character, scene lines (`{wordId|surface}` highlights a word), encounters
- `boss`: timed dialogue items
- `challenge`: casual → formal register items

Then register it in `src/data/index.ts`, set `districtId` on its map node, and you're done.

## Structure

```
src/
  data/            district content + map
  game/            answer checking, spaced repetition/progress, sound
  components/
    CityMap, LineMap, Scene, StationRun, Gauntlet (boss/challenge/review)
    Fx             HUD, departure board, train arrival, XP pop-ups, level-up
    encounters/    Artikel, Lueckentext, Choice (Kollokation + Gespraech), Schmiede
```
