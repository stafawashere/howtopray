import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { build, loadSource, findMissingKeys, checkLocales } from "../scripts/build.js";

let outDir;
let source;

const pagePathFor = code => (code === source.site.defaultLocale ? "/" : `/${code}/`);
const readPage = code => fs.readFileSync(path.join(outDir, pagePathFor(code), "index.html"), "utf8");

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);

    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

before(() => {
  outDir = fs.mkdtempSync(path.join(os.tmpdir(), "sujood-test-"));
  source = build(outDir);
});

after(() => {
  fs.rmSync(outDir, { recursive: true, force: true });
});

test("the build writes a page for every locale with its lang and dir", () => {
  for (const code of source.site.locales) {
    const html = readPage(code);
    const locale = source.locales[code];
    const opening = html.match(/<html lang="([^"]+)" dir="([^"]+)">/);

    assert.ok(opening, `${code}: no <html lang dir> tag`);
    assert.equal(opening[1], locale.lang, `${code}: wrong lang`);
    assert.equal(opening[2], locale.dir, `${code}: wrong dir`);
  }

  assert.equal(source.locales.ar.dir, "rtl");
  assert.equal(source.locales.ur.dir, "rtl");
});

test("every locale has every key the English file has", () => {
  assert.deepEqual(checkLocales(source), []);
});

test("a missing key is reported by its full path", () => {
  const english = loadSource().locales.en;
  const broken = structuredClone(english);

  delete broken.positions.ruku.caption;
  delete broken.ui.playError;

  assert.deepEqual(findMissingKeys(english, broken), ["positions.ruku.caption", "ui.playError"]);
});

test("no page or script is left with an unfilled placeholder", () => {
  const files = listFiles(outDir).filter(file => /\.(html|js|xml|txt)$/.test(file));

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const isMarkup = /\.(html|xml)$/.test(file);
    const pattern = isMarkup ? /\{\{[^}]*\}\}|\bundefined\b|\bnull\b|\[object Object\]/ : /\{\{[^}]*\}\}/;
    const leftover = text.match(pattern);

    assert.ok(!leftover, `${path.relative(outDir, file)} contains ${leftover && leftover[0]}`);
  }
});

test("every internal link, asset path and fragment resolves", () => {
  const exists = urlPath => {
    const file = path.join(outDir, urlPath);

    return urlPath.endsWith("/") ? fs.existsSync(path.join(file, "index.html")) : fs.existsSync(file);
  };

  for (const code of source.site.locales) {
    const html = readPage(code);
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]));
    const references = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map(match => match[1]);
    const controlled = [...html.matchAll(/aria-(?:controls|labelledby)="([^"]+)"/g)].map(match => match[1]);
    let checked = 0;

    for (const reference of references) {
      const isOwnSite = reference.startsWith(source.site.origin);
      const localPath = isOwnSite ? reference.slice(source.site.origin.length) : reference;

      if (localPath.startsWith("#")) {
        assert.ok(ids.has(localPath.slice(1)), `${code}: nothing has id ${localPath}`);
        checked++;
      } else if (localPath.startsWith("/")) {
        const [pathPart, fragment] = localPath.split("#");

        assert.ok(exists(pathPart), `${code}: ${reference} is not in the build`);

        if (fragment) assert.ok(ids.has(fragment), `${code}: ${reference} points at a missing id`);

        checked++;
      }
    }

    for (const id of controlled) assert.ok(ids.has(id), `${code}: aria reference to missing id ${id}`);

    assert.ok(checked > 40, `${code}: only ${checked} internal references were checked`);
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(outDir, "manifest.webmanifest"), "utf8"));

  for (const icon of manifest.icons) assert.ok(exists(icon.src), `manifest icon ${icon.src} is missing`);

  const sitemap = fs.readFileSync(path.join(outDir, "sitemap.xml"), "utf8");
  const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1].slice(source.site.origin.length));

  assert.deepEqual(sitemapPaths.sort(), source.site.locales.map(pagePathFor).sort());
});

test("the service worker caches exactly the pages and assets in the build", () => {
  const script = fs.readFileSync(path.join(outDir, "sw.js"), "utf8");
  const listed = JSON.parse(script.match(/const PRECACHE = (\[[\s\S]*?\]);/)[1]);
  const files = listFiles(outDir).map(file => "/" + path.relative(outDir, file).split(path.sep).join("/"));

  const pages = files.filter(file => file.endsWith("/index.html")).map(file => file.replace(/index\.html$/, ""));
  const scriptsAndStyles = files.filter(file => /\.(css|js)$/.test(file) && file !== "/sw.js");
  const manifest = JSON.parse(fs.readFileSync(path.join(outDir, "manifest.webmanifest"), "utf8"));
  const icons = [...manifest.icons.map(icon => icon.src), "/img/apple-touch-icon.png"];
  const expected = new Set([...pages, ...scriptsAndStyles, ...icons, "/manifest.webmanifest"]);

  assert.equal(pages.length, source.site.locales.length);
  assert.deepEqual([...listed].sort(), [...expected].sort());

  for (const url of listed) {
    const file = url.endsWith("/") ? url + "index.html" : url;

    assert.ok(files.includes(file), `sw.js caches ${url}, which is not in the build`);
  }
});
