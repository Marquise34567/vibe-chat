import { chromium } from "playwright";

const URL = "https://www.facefrenzy.fun";

async function setupBrowser(name: string) {
  const browser = await chromium.launch({ headless: true, args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  const context = await browser.newContext({
    permissions: ["camera", "microphone"],
  });
  const page = await context.newPage();

  const logs: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[webrtc]") || text.includes("[ws]") || text.includes("match server") || text.includes("Signaling")) {
      logs.push(`[${name}] ${text}`);
      console.log(`[${name}] ${text}`);
    }
  });

  return { browser, context, page, logs };
}

async function handleOnboarding(page: any, name: string) {
  // Step 1: Age gate — click "I'm 16 or older"
  const ageBtn = page.locator("button:has-text(\"16 or older\")");
  if (await ageBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log(`[${name}] Clicking age confirm…`);
    await ageBtn.click();
    await page.waitForTimeout(1000);
  }

  // Step 2: Name picker — enter name and click "Start matching"
  const nameInput = page.locator("input[placeholder*='Alex']");
  if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log(`[${name}] Entering name…`);
    await nameInput.fill(name);
    const startBtn = page.locator("button:has-text('Start matching')");
    await startBtn.click();
    await page.waitForTimeout(1000);
  }
}

async function main() {
  console.log("Launching two browsers…");
  const a = await setupBrowser("A");
  const b = await setupBrowser("B");

  try {
    console.log("Navigating to site…");
    await a.page.goto(URL, { waitUntil: "networkidle" });
    await b.page.goto(URL, { waitUntil: "networkidle" });

    await handleOnboarding(a.page, "Alice");
    await handleOnboarding(b.page, "Bob");

    // Both should be on the lobby. Click "Start Video Chat"
    for (const { page, name } of [{ page: a.page, name: "A" }, { page: b.page, name: "B" }]) {
      const startBtn = page.locator("button:has-text('Start Video Chat')");
      if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`[${name}] Clicking Start Video Chat…`);
        await startBtn.click();
      } else {
        console.log(`[${name}] Start Video Chat button not found, trying alternatives…`);
        // Try navigating directly
        await page.goto(`${URL}/match?mode=solo`, { waitUntil: "networkidle" });
      }
      await page.waitForTimeout(2000);
    }

    // Wait for matching
    console.log("Waiting for match (20s)…");
    await a.page.waitForTimeout(20000);

    const aUrl = a.page.url();
    const bUrl = b.page.url();
    console.log(`[A] URL: ${aUrl}`);
    console.log(`[B] URL: ${bUrl}`);

    // Wait for WebRTC
    console.log("Waiting for WebRTC (15s)…");
    await a.page.waitForTimeout(15000);

    // Print logs
    console.log("\n=== A LOGS ===");
    a.logs.forEach(l => console.log(l));
    console.log("\n=== B LOGS ===");
    b.logs.forEach(l => console.log(l));

    // Check video elements
    const aVideos = await a.page.evaluate(() => {
      return Array.from(document.querySelectorAll("video")).map(v => ({
        src: v.srcObject ? "has stream" : "no stream",
        muted: v.muted,
        paused: v.paused,
        w: v.videoWidth,
        h: v.videoHeight,
      }));
    });
    const bVideos = await b.page.evaluate(() => {
      return Array.from(document.querySelectorAll("video")).map(v => ({
        src: v.srcObject ? "has stream" : "no stream",
        muted: v.muted,
        paused: v.paused,
        w: v.videoWidth,
        h: v.videoHeight,
      }));
    });
    console.log("\n[A] Videos:", JSON.stringify(aVideos));
    console.log("[B] Videos:", JSON.stringify(bVideos));

  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await a.browser.close();
    await b.browser.close();
  }
}

main().catch(console.error);
