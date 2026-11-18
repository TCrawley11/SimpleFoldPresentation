"""Render every slide (all fragments shown) to PNG and report console errors.

Usage: PLAYWRIGHT_BROWSERS_PATH=~/.pw python3 tools/shoot.py [out_dir]
"""
import sys, pathlib, time
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parents[1]
out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/shots")
out.mkdir(parents=True, exist_ok=True)
errors = []

with sync_playwright() as p:
    b = p.chromium.launch(args=["--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1920, "height": 1080})
    pg.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type == "error" or (m.type == "warning" and "GPU stall" not in m.text) else None)
    pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    pg.goto((root / "index.html").as_uri())
    pg.wait_for_function("window.Reveal && Reveal.isReady()")
    n = pg.evaluate("Reveal.getTotalSlides()")
    for i in range(n):
        pg.evaluate(f"Reveal.slide({i}, 0, 99)")
        time.sleep(6.5 if i in (0, n - 1) else 1.5)
        pg.screenshot(path=str(out / f"slide{i + 1:02d}.png"))
    # extra: flow toy in sampling mode after play
    pg.evaluate("Reveal.slide(5, 0, 99)"); time.sleep(1.0)
    pg.click("[data-mode=sample]")
    pg.click("[data-play]")
    time.sleep(4.5)
    pg.screenshot(path=str(out / "slide06b_sampling.png"))
    b.close()

print(f"{n} slides -> {out}")
print("\n".join(errors) if errors else "no console errors")
