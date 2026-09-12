import { chromium, devices } from "@playwright/test";
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices["Desktop Chrome"] });
const p = await ctx.newPage();
await p.setViewportSize({ width: 360, height: 640 });
await p.goto("http://127.0.0.1:3210/");
const out = await p.evaluate(() => {
  const ancho = document.documentElement.clientWidth;
  return {
    ancho,
    innerWidth: window.innerWidth,
    imgs: [...document.querySelectorAll("main img")].map((i) => ({
      src: (i.getAttribute("src") || "").slice(0, 30),
      w: Math.round(i.getBoundingClientRect().width),
    })),
  };
});
console.log(JSON.stringify(out, null, 2));
await b.close();
