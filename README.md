# திருவிவிலியம் — Bible in Tamil (Mobile Web App)

An offline-capable mobile web app built from the entire contents of **bibleintamil.com**.

## What's inside

- **6 Bible versions, 204,018 verses**
  - பொது மொழிபெயர்ப்பு (Ecumenical Tamil) — 75 books
  - கிங் ஜேம்ஸ் (தமிழ்) — 66 books
  - கத்தோலிக்க (பழைய) — 73 books
  - New American English — 73 books
  - King James English — 66 books
  - NRSV — 73 books
- **Verse search** across all 3 Tamil versions (offline index)
- **Side-by-side version comparison**
- **Chapter audio** — streams from bibleintamil.com (needs internet)
- **60 Catholic prayers** (ஜெபங்கள்) in Tamil
- **33 articles** — Bible history, theology, sacraments, Mass, saints, marriage, Lent…
- **48 song albums, 1,577 songs** — stream audio from bibleintamil.com
- Daily verse, font-size control, continue-reading bookmark

## How to use

1. Unzip the package.
2. Open `app/index.html` in any modern mobile or desktop browser.
   - Or host the `app/` folder on any static web server.
3. No build step, no dependencies. All data is local JSON.

Audio streaming (chapter/song playback) requires an internet connection;
everything else works fully offline.

## Data layout

```
app/
  index.html  css/app.css  js/app.js
  data/
    meta.json            version + book index
    ecu|kjt|rct|nae|kje|nrsv/<book>.json   chapters, verses, audio URLs
    search/ecu|kjt|rct.json                offline word index (lazy-loaded)
    prayers/*.json       60 prayers
    pages/*.json         33 articles
    songs/*.json         48 albums with song lists + stream URLs
```

Source: https://bibleintamil.com — compiled by Fr. Mariadas Lipton.
Extracted October 2026.
