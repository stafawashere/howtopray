# Sujood

A one-page guide to the eight positions of salah, in the order you do them. Each position has a simple figure of the body and the words you say there, in Arabic, transliteration and English. The recitations have a Listen button so you can hear the line instead of guessing at it from the spelling. At the bottom there's a table of how many rak'ahs each of the five prayers has.

It's live at [sujood.online](https://sujood.online).

## How it's built

There's no build step and no framework. The page is all in `index.html`: the markup, the CSS and one small script at the bottom that runs the Listen buttons, the "Show full text" toggles and the bar of positions that stays along the top of the screen. The fonts are EB Garamond and Amiri (for the Arabic) from Google Fonts.

The figures are inline SVG pictograms. Every position is drawn on the same 100 by 100 grid from the same body, so the head, arms and legs are the same size in every one, and the dotted line at the top of the page joins the head positions to show how a rak'ah goes up and down.

The collapsed text uses `hidden="until-found"`, so searching the page in Chrome or Edge opens the section that has the match.

The head has the search and sharing metadata: a canonical URL, Open Graph and Twitter tags pointing at `img/og.png`, and a JSON-LD block that describes the page as a `HowTo` with the eight positions as steps. If you change a position's wording, change its step there too. `robots.txt` and `sitemap.xml` sit at the root for crawlers.

The page can be installed to a phone's home screen through `manifest.webmanifest` and the icons in `img/`. `sw.js` is a small service worker that keeps a copy of the page, the icons and the fonts, so the guide still opens without signal once it has been visited. It always tries the network first for the page itself, so a deploy shows up on the next online visit. The audio isn't cached. The images in `img/` are drawn by `tools/make_images.py` from the same figure coordinates as the SVG symbols. It needs Pillow and runs on macOS because it uses the system Baskerville. Run `python3 tools/make_images.py img` to redraw them.

The Share button in the footer opens the phone's share sheet where the browser supports it, and copies the link everywhere else.

`support.js` is the old runtime from before the redesign. The page doesn't load it anymore.

None of the audio lives in this repo. When you press Listen, the page makes an `Audio` object pointed at an MP3 and the browser streams it straight from the source. Al-Fatihah and Al-Ikhlas are Mishary Rashid Alafasy's recitation from quranicaudio.com, and the other lines (the opening dua, what you say in ruku and sujud, the tashahhud, the salawat and the rest) come from hisnmuslim.com. Only one track plays at a time, and pressing the button again stops it.

Every push to `main` deploys the repo to GitHub Pages through `.github/workflows/deploy.yml`, and `CNAME` points sujood.online at it.

## Running it locally

Any static file server works. From the repo folder:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. You need to be online for the fonts and the audio, because they load from other sites.
