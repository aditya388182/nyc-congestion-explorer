// Render a local HTML file to PDF with Playwright's Chromium: node scripts/html_to_pdf.mjs in.html out.pdf
import { chromium } from "playwright-core";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("usage: html_to_pdf.mjs in.html out.pdf");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(resolve(input)).href, { waitUntil: "load" });
await page.pdf({ path: resolve(output), format: "Letter", printBackground: true, preferCSSPageSize: true });
await browser.close();
