import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { config } from "dotenv";
import { stringToBase64URL } from "@supabase/ssr/dist/main/utils/base64url.js";
import { createChunks } from "@supabase/ssr/dist/main/utils/chunker.js";
config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BASE = process.argv[2];
if (!BASE) throw new Error("Usage: node screenshot-tmp.mjs <base-url>");
const HOST = new URL(BASE).hostname;
const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];

const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: "laura.lisboa@daredata.engineering",
});
if (linkErr) throw linkErr;

const anon = createClient(SUPABASE_URL, ANON_KEY);
const { data: verifyData, error: verifyErr } = await anon.auth.verifyOtp({
  type: "magiclink",
  token_hash: linkData.properties.hashed_token,
});
if (verifyErr) throw verifyErr;

const session = verifyData.session;
const cookieValue = "base64-" + stringToBase64URL(JSON.stringify(session));
const chunks = createChunks(`sb-${projectRef}-auth-token`, cookieValue);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await context.addCookies(
  chunks.map(({ name, value }) => ({ name, value, domain: HOST, path: "/", secure: true, httpOnly: false, sameSite: "Lax" })),
);

const page = await context.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("CONSOLE ERROR:", msg.text());
});

await page.goto(`${BASE}/suggest`);
await page.waitForLoadState("networkidle");
console.log("suggest url:", page.url());
await page.screenshot({ path: "scripts/screenshot-suggest.png", fullPage: true });

await browser.close();
