import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const STATIC = path.join(ROOT, "static");
const IMAGES = path.join(ROOT, "img");
export const OUT = path.join(ROOT, "_site");

// These are for the README on GitHub, not for the site.
const README_ONLY_IMAGES = ["banner-dark.png", "banner-light.png", "screenshot-dark.png", "screenshot-light.png"];

const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));

export function loadSource() {
  const site = readJson(path.join(SRC, "site.json"));
  const locales = {};

  for (const code of site.locales) {
    const cssFile = path.join(SRC, "locales", `${code}.css`);

    locales[code] = readJson(path.join(SRC, "locales", `${code}.json`));
    locales[code].code = code;
    locales[code].css = fs.existsSync(cssFile) ? fs.readFileSync(cssFile, "utf8") : null;
  }

  return {
    site,
    locales,
    arabic: readJson(path.join(SRC, "arabic.json")),
    audio: readJson(path.join(SRC, "audio.json")),
    template: fs.readFileSync(path.join(SRC, "template.html"), "utf8"),
    serviceWorker: fs.readFileSync(path.join(SRC, "sw.js"), "utf8")
  };
}

// Lists every key in the reference that the other object lacks, as dotted paths.
// Arrays are left alone, since a translation is free to drop a transliteration
// line that makes no sense in its script.
export function findMissingKeys(reference, candidate, prefix = "") {
  const missing = [];

  for (const [key, value] of Object.entries(reference)) {
    const keyPath = prefix ? `${prefix}.${key}` : key;
    const hasKey = candidate !== null && typeof candidate === "object" && key in candidate;

    if (!hasKey) {
      missing.push(keyPath);
      continue;
    }

    const isNestedObject = value !== null && typeof value === "object" && !Array.isArray(value);

    if (isNestedObject) {
      missing.push(...findMissingKeys(value, candidate[key], keyPath));
    }
  }

  return missing;
}

export function checkLocales(source) {
  const reference = source.locales[source.site.defaultLocale];
  const problems = [];

  for (const [code, locale] of Object.entries(source.locales)) {
    for (const key of findMissingKeys(reference, locale)) {
      problems.push(`${code}.json is missing "${key}"`);
    }
  }

  return problems;
}

const escapeAttribute = value => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function indent(lines, spaces) {
  const pad = " ".repeat(spaces);
  return lines.map(line => (line === "" ? "" : pad + line));
}

function pagePath(site, code) {
  return code === site.defaultLocale ? "/" : `/${code}/`;
}

function localDigits(locale, number) {
  const digits = locale.digits || "0123456789";
  return String(number).replace(/[0-9]/g, digit => digits[digit]);
}

function renderLine(line, context) {
  const { arabic, audio, locale } = context;

  if ("listen" in line || "more" in line) {
    const buttons = [];

    if (line.listen) {
      const url = audio[line.listen];

      if (!url) throw new Error(`${locale.code}: no audio track called "${line.listen}"`);

      // data-track is unused now, but service workers from before the build
      // step still serve an app.js that looks the audio up by it.
      buttons.push(`<button type="button" class="listen" data-track="${line.listen}" data-src="${escapeAttribute(url)}" data-title="${escapeAttribute(line.title)}"></button>`);
    }

    if (line.more) {
      buttons.push(`<button type="button" class="more-btn" aria-controls="more-${line.more}"></button>`);
    }

    return ["<div class=\"controls\">", ...indent(buttons, 2), "</div>"];
  }

  const isArabic = "arabic" in line || "arabicSmall" in line;

  if (isArabic) {
    const key = line.arabic || line.arabicSmall;
    const text = arabic.lines[key];
    const className = line.arabic ? "ar" : "ar sm";

    if (text === undefined) throw new Error(`${locale.code}: no Arabic line called "${key}"`);

    return [`<p class="${className}" lang="ar" dir="rtl">${text}</p>`];
  }

  const LINE_CLASSES = { tr: "tr", meaning: "en", when: "when", note: "note" };
  const kind = Object.keys(LINE_CLASSES).find(name => name in line);

  if (!kind) throw new Error(`${locale.code}: unknown line ${JSON.stringify(line)}`);

  const langAttribute = line.lang ? ` lang="${line.lang}"` : "";
  const dirAttribute = line.dir ? ` dir="${line.dir}"` : "";

  return [`<p class="${LINE_CLASSES[kind]}"${langAttribute}${dirAttribute}>${line[kind]}</p>`];
}

function renderLines(lines, context) {
  return lines.flatMap(line => renderLine(line, context));
}

function renderVerse(verse, context) {
  if (verse.pair) {
    return [`<div class="verse pair">${renderLines(verse.lines, context).join("")}</div>`];
  }

  return ["<div class=\"verse\">", ...indent(renderLines(verse.lines, context), 2), "</div>"];
}

function renderSayBlock(block, context) {
  const lines = renderLines(block.lines, context);

  if (block.more) {
    const toggle = block.lines.find(line => line.more);

    if (!toggle) throw new Error(`${context.locale.code}: a block has full text but no "more" button`);

    const verses = block.more.flatMap(verse => renderVerse(verse, context));

    lines.push(`<div class="more" id="more-${toggle.more}">`, "  <div class=\"more-in\">", ...indent(verses, 4), "  </div>", "</div>");
  }

  return ["<div class=\"say\">", ...indent(lines, 2), "</div>"];
}

function renderPosition(position, index, context) {
  const { locale, arabic } = context;
  const text = locale.positions[position.id];
  const number = localDigits(locale, index + 1);
  const sectionClass = position.brief ? "pos is-brief" : "pos";
  const arabicName = locale.arabicNames.headings ? ` <span class="h-ar" lang="ar" dir="rtl">${arabic.names[position.id]}</span>` : "";
  const sayColumn = text.say.flatMap(block => renderSayBlock(block, context));

  if (text.aside) sayColumn.push(`<p class="aside">${text.aside}</p>`);

  return [
    `<section class="${sectionClass}" id="${position.id}" aria-labelledby="${position.id}-h">`,
    "  <header class=\"stage\">",
    `    <svg class="fig" viewBox="0 0 100 100" aria-hidden="true"><use href="#p-${position.figure}"/></svg>`,
    `    <h2 id="${position.id}-h"><span class="n">${number}</span> <span class="h-en">${text.title}</span>${arabicName}</h2>`,
    "  </header>",
    "  <div class=\"do\">",
    `    <p class="cap">${text.caption}</p>`,
    `    <p class="instr">${text.instruction}</p>`,
    "  </div>",
    "  <div class=\"say-col\">",
    ...indent(sayColumn, 4),
    "  </div>",
    "</section>"
  ];
}

function renderCounts(context) {
  const { site, locale } = context;
  const counts = locale.counts;

  const marksFor = prayer => {
    const marks = [];

    for (let rakah = 1; rakah <= prayer.rakahs; rakah++) {
      const isAloud = rakah <= prayer.aloud;
      const hasMiddleSitting = rakah === 2 && prayer.rakahs > 2;
      const classes = [isAloud ? "aloud" : "", hasMiddleSitting ? "sit" : ""].filter(Boolean).join(" ");

      marks.push(classes ? `<i class="${classes}"></i>` : "<i></i>");
    }

    return marks.join("");
  };

  const rows = site.prayers.flatMap(prayer => [
    "<tr role=\"row\">",
    `  <th scope="row" role="rowheader">${counts.prayers[prayer.id].name}</th>`,
    `  <td class="c-num" role="cell">${localDigits(locale, prayer.rakahs)}</td>`,
    `  <td role="cell"><span class="c-note">${counts.prayers[prayer.id].note}</span><span class="marks" aria-hidden="true">${marksFor(prayer)}</span></td>`,
    "</tr>"
  ]);

  // The roles are explicit because wide screens restyle the table with
  // display: block, and some browsers then stop reading it as a table.
  return [
    "<section class=\"counts\" id=\"counts\" aria-labelledby=\"counts-h\">",
    `  <h2 id="counts-h">${counts.title}</h2>`,
    "  <div class=\"counts-panel\">",
    "    <table role=\"table\">",
    "      <thead role=\"rowgroup\">",
    `        <tr role="row"><th scope="col" role="columnheader">${counts.prayerColumn}</th><th scope="col" colspan="2" role="columnheader">${counts.rakahsColumn}</th></tr>`,
    "      </thead>",
    "      <tbody role=\"rowgroup\">",
    ...indent(rows, 8),
    "      </tbody>",
    "    </table>",
    `    <p class="marks-key" aria-hidden="true"><span><span class="marks"><i class="aloud"></i></span>${counts.aloud}</span><span><span class="marks"><i></i></span>${counts.quiet}</span></p>`,
    "  </div>",
    `  <p class="aside">${counts.aside}</p>`,
    "</section>"
  ];
}

function renderJsonLd(context) {
  const { site, locale } = context;
  const pageUrl = site.origin + pagePath(site, locale.code);
  const json = value => JSON.stringify(value).replace(/<\//g, "<\\/");

  const steps = site.positions.map((position, index) => {
    const step = locale.positions[position.id].step;

    return `        { "@type": "HowToStep", "position": ${index + 1}, "name": ${json(step.name)}, "text": ${json(step.text)}, "url": ${json(pageUrl + "#" + position.id)} }`;
  });

  return [
    "{",
    "  \"@context\": \"https://schema.org\",",
    "  \"@graph\": [",
    "    {",
    "      \"@type\": \"WebSite\",",
    `      "@id": ${json(site.origin + "/#site")},`,
    "      \"name\": \"Sujood\",",
    `      "url": ${json(site.origin + "/")},`,
    "      \"inLanguage\": \"en\"",
    "    },",
    "    {",
    "      \"@type\": \"HowTo\",",
    `      "name": ${json(locale.howTo.name)},`,
    `      "description": ${json(locale.howTo.description)},`,
    `      "image": ${json(site.origin + "/img/og.png")},`,
    `      "inLanguage": ${json(locale.lang)},`,
    `      "isPartOf": { "@id": ${json(site.origin + "/#site")} },`,
    "      \"step\": [",
    steps.join(",\n"),
    "      ]",
    "    }",
    "  ]",
    "}"
  ].join("\n");
}

export function renderPage(code, source) {
  const { site, locales, arabic, audio, template } = source;
  const locale = locales[code];
  const context = { site, locale, arabic, audio };
  const pageUrl = site.origin + pagePath(site, code);

  const alternates = [
    ...site.locales.map(other => `<link rel="alternate" hreflang="${locales[other].lang}" href="${site.origin}${pagePath(site, other)}">`),
    `<link rel="alternate" hreflang="x-default" href="${site.origin}${pagePath(site, site.defaultLocale)}">`
  ];

  const fontFamilies = [...site.fonts, ...(locale.extraFonts || [])].map(family => "family=" + family.replace(/ /g, "+"));
  const fontsUrl = `https://fonts.googleapis.com/css2?${fontFamilies.join("&")}&display=swap`;

  const contentsItems = site.positions.map((position, index) => {
    const text = locale.positions[position.id];
    const arabicName = locale.arabicNames.contents ? `<span class="toc-ar" lang="ar" dir="rtl" aria-hidden="true">${arabic.names[position.id]}</span>` : "";

    return `<li><a href="#${position.id}"><span class="toc-n">${localDigits(locale, index + 1)}</span><span class="toc-name">${text.title}</span><span class="toc-says">${text.says}</span>${arabicName}</a></li>`;
  });
  contentsItems.push(`<li class="toc-extra"><a href="#counts"><span class="toc-n" aria-hidden="true"></span><span class="toc-name">${locale.counts.title}</span><span class="toc-says">${locale.counts.says}</span></a></li>`);

  const runnerItems = site.positions.map((position, index) => {
    const text = locale.positions[position.id];
    const number = localDigits(locale, index + 1);
    const label = locale.runner.itemLabel.replace("{n}", number).replace("{title}", text.title);

    return `<li><a href="#${position.id}" aria-label="${escapeAttribute(label)}"><svg viewBox="0 0 100 100" aria-hidden="true"><use href="#p-${position.figure}"/></svg><span class="r-n">${number}</span><span class="r-name" aria-hidden="true">${text.short}</span></a></li>`;
  });
  runnerItems.push(`<li class="r-extra"><a href="#counts" aria-label="${escapeAttribute(locale.counts.title)}"><span class="r-name">${locale.counts.short}</span></a></li>`);

  const positions = site.positions.flatMap((position, index) => [...renderPosition(position, index, context), ""]);
  positions.pop();

  const values = {
    lang: locale.lang,
    dir: locale.dir,
    pageUrl,
    ogLocale: locale.ogLocale,
    origin: site.origin,
    alternates: alternates.join("\n"),
    siteName: escapeAttribute(locale.siteName),
    appTitle: escapeAttribute(locale.appTitle),
    brand: locale.brand,
    arabicTitle: arabic.title,
    jsonLd: renderJsonLd(context),
    fontsUrl,
    localeStyle: locale.css ? `<style>\n${locale.css}</style>\n` : "",
    "meta.title": locale.meta.title,
    "meta.description": escapeAttribute(locale.meta.description),
    "meta.ogTitle": escapeAttribute(locale.meta.ogTitle),
    "meta.ogDescription": escapeAttribute(locale.meta.ogDescription),
    "meta.ogImageAlt": escapeAttribute(locale.meta.ogImageAlt),
    "mast.subtitle": locale.mast.subtitle,
    "mast.lede": locale.mast.lede,
    "flow.name": locale.flow.name,
    flowSteps: indent(locale.flow.steps.map(step => `<li>${step}</li>`), 8).join("\n"),
    "flow.next": locale.flow.next,
    "flow.sentence": locale.flow.sentence,
    "contents.label": escapeAttribute(locale.contents.label),
    contentsItems: indent(contentsItems, 6).join("\n"),
    "runner.label": escapeAttribute(locale.runner.label),
    runnerItems: indent(runnerItems, 6).join("\n"),
    positions: indent(positions, 4).join("\n"),
    counts: indent(renderCounts(context), 4).join("\n"),
    "footer.note": locale.footer.note,
    "footer.sharePrompt": locale.footer.sharePrompt,
    "ui.share": locale.ui.share,
    "ui.stop": locale.ui.stop,
    uiJson: JSON.stringify(locale.ui, null, 2).replace(/<\//g, "<\\/")
  };

  return fillPlaceholders(template, values, `template for ${code}`);
}

function fillPlaceholders(text, values, label) {
  return text.replace(/\{\{([\w.]+)\}\}/g, (match, name) => {
    if (!(name in values)) throw new Error(`${label}: nothing to fill {{${name}}}`);

    return values[name];
  });
}

function copyDirectory(from, to, skip = []) {
  fs.mkdirSync(to, { recursive: true });

  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const isSkipped = skip.includes(entry.name) || entry.name === ".DS_Store";

    if (isSkipped) continue;

    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(source, target);
    } else {
      fs.copyFileSync(source, target);
    }
  }
}

// Everything a page needs to open offline: the pages themselves, plus the
// stylesheets, scripts, manifest and icons they point at on this origin.
export function precacheList(outDir, site) {
  const pages = site.locales.map(code => pagePath(site, code));
  const assets = new Set();

  for (const page of pages) {
    const html = fs.readFileSync(path.join(outDir, page, "index.html"), "utf8");
    const tags = html.match(/<(link|script)\b[^>]*>/g) || [];

    for (const tag of tags) {
      const isAlternatePage = /rel="(canonical|alternate)"/.test(tag);
      const reference = tag.match(/\b(?:href|src)="(\/[^"/][^"]*)"/);

      if (reference && !isAlternatePage) assets.add(reference[1]);
    }
  }

  const manifest = readJson(path.join(outDir, "manifest.webmanifest"));

  for (const icon of manifest.icons) assets.add(icon.src);

  return [...pages, ...[...assets].sort()];
}

function writeServiceWorker(outDir, source) {
  const precache = precacheList(outDir, source.site);
  const hash = crypto.createHash("sha256");

  for (const url of precache) {
    const file = url.endsWith("/") ? path.join(outDir, url, "index.html") : path.join(outDir, url);

    hash.update(url);
    hash.update(fs.readFileSync(file));
  }

  const cacheName = "sujood-" + hash.digest("hex").slice(0, 10);
  const precacheLines = "[\n" + precache.map(url => `  ${JSON.stringify(url)}`).join(",\n") + "\n]";
  const script = fillPlaceholders(source.serviceWorker, { cacheName, precache: precacheLines }, "sw.js");

  fs.writeFileSync(path.join(outDir, "sw.js"), script);
}

function writeSitemap(outDir, site) {
  const urls = site.locales.map(code => `  <url>\n    <loc>${site.origin}${pagePath(site, code)}</loc>\n  </url>`);
  const xml = [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">",
    ...urls,
    "</urlset>",
    ""
  ].join("\n");

  fs.writeFileSync(path.join(outDir, "sitemap.xml"), xml);
}

export function build(outDir = OUT) {
  const source = loadSource();
  const problems = checkLocales(source);

  if (problems.length) throw new Error("Translation files are incomplete:\n  " + problems.join("\n  "));

  fs.rmSync(outDir, { recursive: true, force: true });
  copyDirectory(STATIC, outDir);
  copyDirectory(IMAGES, path.join(outDir, "img"), README_ONLY_IMAGES);

  for (const code of source.site.locales) {
    const pageDir = path.join(outDir, pagePath(source.site, code));

    fs.mkdirSync(pageDir, { recursive: true });
    fs.writeFileSync(path.join(pageDir, "index.html"), renderPage(code, source));
  }

  writeSitemap(outDir, source.site);
  writeServiceWorker(outDir, source);

  return source;
}

const isRunDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isRunDirectly) {
  try {
    const source = build();
    console.log(`Built ${source.site.locales.length} pages into ${path.relative(process.cwd(), OUT) || "."}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
