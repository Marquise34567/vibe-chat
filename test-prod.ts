import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("Navigating to https://www.facefrenzy.fun ...");
  await page.goto("https://www.facefrenzy.fun", { waitUntil: "networkidle", timeout: 30000 });

  // Check what overlays exist
  const overlays = await page.$$eval(".fixed.inset-0", (els) =>
    els.map((e) => ({
      z: (e as HTMLElement).style.zIndex || getComputedStyle(e).zIndex,
      text: (e as HTMLElement).innerText?.slice(0, 100),
      visible: (e as HTMLElement).offsetParent !== null,
    }))
  );
  console.log("\nOverlays found:", JSON.stringify(overlays, null, 2));

  // Check for age gate
  const ageGateText = await page.$("text=I'm 16 or older");
  console.log("Age gate button found:", !!ageGateText);

  if (ageGateText) {
    await ageGateText.click({ force: true });
    await page.waitForTimeout(1000);

    // Check if name step appeared
    const nameInput = await page.$("input[placeholder*='Alex']");
    console.log("Name input found after age click:", !!nameInput);

    if (nameInput) {
      await nameInput.fill("TestUser");
      const btn = await page.$("text=Start matching");
      if (btn) {
        await btn.click({ force: true });
        await page.waitForTimeout(2000);
      }
    }
  }

  // Check overlays again
  const overlays2 = await page.$$eval(".fixed.inset-0", (els) =>
    els.map((e) => ({
      z: (e as HTMLElement).style.zIndex || getComputedStyle(e).zIndex,
      text: (e as HTMLElement).innerText?.slice(0, 100),
      visible: (e as HTMLElement).offsetParent !== null,
    }))
  );
  console.log("\nOverlays after age gate:", JSON.stringify(overlays2, null, 2));

  // Check if Start Video Chat is clickable
  const startBtn = await page.$("text=Start Video Chat");
  console.log("\nStart button found:", !!startBtn);

  if (startBtn) {
    const box = await startBtn.boundingBox();
    console.log("Start button position:", JSON.stringify(box));

    // Check what's at that position
    if (box) {
      const elemAtPoint = await page.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        return el ? {
          tag: el.tagName,
          class: el.className,
          text: (el as HTMLElement).innerText?.slice(0, 80),
          z: getComputedStyle(el).zIndex,
        } : null;
      }, [box.x + box.width / 2, box.y + box.height / 2]);
      console.log("Element at Start button center:", JSON.stringify(elemAtPoint));
    }
  }

  // Get the full page text
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
  console.log("\nPage text:", bodyText);

  await page.screenshot({ path: "screenshots/prod-debug.png", fullPage: false });

  await browser.close();
})();
