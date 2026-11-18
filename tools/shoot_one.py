"""Capture one slide (all fragments shown) in headless Chromium, optionally at 2x for detail checks.

Usage: PLAYWRIGHT_BROWSERS_PATH=~/.pw python3 tools/shoot_one.py <slide_number_1based> [out.png] [scale]
"""
import sys, pathlib, time
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parents[1]
n = int(sys.argv[1])
out = sys.argv[2] if len(sys.argv) > 2 else f"/tmp/slide{n:02d}.png"
scale = float(sys.argv[3]) if len(sys.argv) > 3 else 1
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(args=["--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=scale)
    pg.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    pg.goto((root / "index.html").as_uri())
    pg.wait_for_function("window.Reveal && Reveal.isReady()")
    pg.evaluate(f"Reveal.slide({n - 1}, 0, 99)")
    time.sleep(1.5)
    pg.screenshot(path=out)
    b.close()
print(out)
print("\n".join(errors) if errors else "no console errors")
