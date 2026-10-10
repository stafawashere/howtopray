import fs from "node:fs";

// This isn't in the tests because it depends on two other sites being up.
const tracks = JSON.parse(fs.readFileSync(new URL("../src/audio.json", import.meta.url), "utf8"));
const urls = [...new Set(Object.values(tracks))];

async function check(url) {
  try {
    const response = await fetch(url, { headers: { Range: "bytes=0-1023" }, redirect: "follow" });
    const type = response.headers.get("content-type") || "";
    const isAudio = response.ok && type.startsWith("audio/");

    await response.body?.cancel();

    return { url, ok: isAudio, detail: `${response.status} ${type}` };
  } catch (error) {
    return { url, ok: false, detail: error.cause?.code || error.message };
  }
}

const results = await Promise.all(urls.map(check));
const failures = results.filter(result => !result.ok);

for (const result of results) {
  console.log(`${result.ok ? "ok  " : "FAIL"} ${result.detail.padEnd(22)} ${result.url}`);
}

console.log(`\n${results.length - failures.length} of ${results.length} tracks answered with audio`);
process.exitCode = failures.length ? 1 : 0;
