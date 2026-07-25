/**
 * Print Website-Discovery-Meeting-Brief.html to PDF via Chrome headless.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const dir = __dirname;
const html = path.join(dir, "Website-Discovery-Meeting-Brief.html");
const pdf = path.join(dir, "Website-Discovery-Meeting-Brief.pdf");
const chrome =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

if (!fs.existsSync(html)) {
  console.error("Missing HTML:", html);
  process.exit(1);
}
if (!fs.existsSync(chrome)) {
  console.error("Chrome not found. Set CHROME_PATH.");
  process.exit(1);
}

const uri = "file:///" + html.replace(/\\/g, "/");
const result = spawnSync(
  chrome,
  ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${pdf}`, uri],
  { encoding: "utf8" }
);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || "Chrome failed");
  process.exit(result.status || 1);
}

const stat = fs.statSync(pdf);
console.log("Wrote:", pdf, `(${stat.size} bytes)`);
