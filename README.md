# How to Pray

A one-page guide to the eight positions of salah, in the order you do them. Each position has a simple figure of the body and the words you say there, in Arabic, transliteration and English. The recitations have a Listen button so you can hear the line instead of guessing at it from the spelling. At the bottom there's a table of how many rak'ahs each of the five prayers has.

It's live at [howtopray.mahfujmustafa.dev](https://howtopray.mahfujmustafa.dev).

## How it's built

There's no build step. The page is all in `index.html`. The figures are inline SVG and the fonts come from Google Fonts.

`support.js` is a generated runtime file that I don't edit by hand. It loads React 18.3.1 and Babel from unpkg and renders the template in `index.html`, which is what makes the Listen buttons and the "Show full text" toggles work.

None of the audio lives in this repo. When you press Listen, the page makes an `Audio` object pointed at an MP3 and the browser streams it straight from the source. Al-Fatihah and Al-Ikhlas are Mishary Rashid Alafasy's recitation from quranicaudio.com, and the other lines (the opening dua, what you say in ruku and sujud, the tashahhud, the salawat and the rest) come from hisnmuslim.com. Only one track plays at a time, and pressing the button again stops it.

Every push to `main` deploys the repo to GitHub Pages through `.github/workflows/deploy.yml`, and `CNAME` points the subdomain at it.

## Running it locally

Any static file server works. From the repo folder:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. You need to be online, because React, the fonts and the audio all load from other sites.
