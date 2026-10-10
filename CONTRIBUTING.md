# Contributing

Thanks for looking. The two things Sujood needs most are native speakers to check the translations and people to point out mistakes in what the page says. Code changes are welcome too, but please open an issue first if it's more than a small fix.

## Checking or fixing a translation

Every language has one file in `src/locales/`, named by its language code, like `src/locales/ur.json`. `en.json` is the reference, and every other file has the same keys.

You only need to change the text values. A few things look like text but aren't meant to be translated:

- `arabic` and `arabicSmall` lines name a line in `src/arabic.json`, which every page shares. Leave them as they are. If the Arabic itself is wrong, that's the second kind of report below.
- `listen` names the audio track and `more` names the collapsed panel it opens. Translate the `title` next to them, since screen readers read it out.
- `lang`, `dir`, `ogLocale` and `digits` describe the language itself.

Some values have a little HTML in them, like `<em>rak'ah</em>` or a link to `#tashahhud`. Keep the tags and translate the words around them. A transliteration line (`tr`) can be left out of a language where it doesn't help, which is what the Arabic page does.

To see your change, run this from the repo folder (you need Node 20 or newer, and nothing else):

```bash
npm run serve
```

Then open http://localhost:8000/ur/ or whichever code you changed. Run `npm test` before you open a pull request. If you've missed a key, the build stops and names it.

If you've checked a whole language and you're happy with it, say so in the pull request, along with how you'd like to be credited, and I'll add you to the README.

### Adding a language

Copy `en.json` to a new file named by the language code, add the code to `locales` in `src/site.json` and translate the values. Set `dir` to `rtl` for a right-to-left script. If the script needs its own font, add it to `extraFonts` the way `bn.json` does, and put any spacing changes in a CSS file with the same name, like `src/locales/bn.css`.

## Reporting a mistake in a recitation, transliteration or meaning

Please [open an issue](https://github.com/stafawashere/sujood.online/issues/new/choose) and pick "Mistake in a recitation". Say which language and which position it's in, what the page says now and what it should say. A source helps a lot, like a hadith reference or a printed book of du'a, because I'd rather check a correction than guess at it.

Some differences aren't mistakes. The schools of fiqh differ on details like the opening supplication, saying Amin aloud or quietly and where qunut goes, and the footer of the page already says so. If you think the page should mention another view, open an issue and we can talk about it.
