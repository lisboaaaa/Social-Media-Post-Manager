import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { config } from "dotenv";
import { stringToBase64URL } from "@supabase/ssr/dist/main/utils/base64url.js";
import { createChunks } from "@supabase/ssr/dist/main/utils/chunker.js";
config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BASE = "https://socialmediapostmanager.vercel.app";
const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];

const { data: linkData } = await admin.auth.admin.generateLink({ type: "magiclink", email: "laura.lisboa@daredata.engineering" });
const anon = createClient(SUPABASE_URL, ANON_KEY);
const { data: verifyData } = await anon.auth.verifyOtp({ type: "magiclink", token_hash: linkData.properties.hashed_token });
const cookieValue = "base64-" + stringToBase64URL(JSON.stringify(verifyData.session));
const chunks = createChunks(`sb-${projectRef}-auth-token`, cookieValue);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await context.addCookies(chunks.map(({ name, value }) => ({ name, value, domain: "socialmediapostmanager.vercel.app", path: "/", secure: true, httpOnly: false, sameSite: "Lax" })));
const page = await context.newPage();
page.on("console", (msg) => { if (msg.type() === "error") console.log("CONSOLE ERROR:", msg.text()); });

await page.goto(`${BASE}/board`);
await page.waitForLoadState("networkidle");
await page.getByRole("button", { name: "Development tools" }).click();
await page.waitForTimeout(1000);
await page.screenshot({ path: "scripts/devtools-1-open.png", fullPage: true });

// Click "Run 90-day purge now" to test the manual trigger end-to-end.
await page.getByRole("button", { name: "Run 90-day purge now" }).click();
await page.waitForTimeout(1500);
await page.screenshot({ path: "scripts/devtools-2-purge.png", fullPage: true });

await browser.close();
