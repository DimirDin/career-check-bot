"""
Generate PNG icons from logo.svg using cairosvg (preferred) or Pillow fallback.
Usage: python scripts/generate_icons.py
"""
import os
import sys

SVG_PATH = os.path.join(os.path.dirname(__file__), "../miniapp/public/icons/logo.svg")
OUT_DIR  = os.path.join(os.path.dirname(__file__), "../miniapp/public/icons")
SIZES    = [64, 512]

def generate_with_cairosvg():
    import cairosvg
    for size in SIZES:
        out = os.path.join(OUT_DIR, f"icon-{size}.png")
        cairosvg.svg2png(url=SVG_PATH, write_to=out, output_width=size, output_height=size)
        print(f"Generated {out}")

def generate_with_pillow():
    from PIL import Image
    import xml.etree.ElementTree as ET

    # Pillow doesn't render SVG natively — create a simple gradient placeholder
    print("WARNING: cairosvg not found, generating placeholder icons with Pillow.")
    print("Install cairosvg for proper SVG rendering: pip install cairosvg")

    for size in SIZES:
        img = Image.new("RGBA", (size, size), (11, 14, 26, 255))
        # Draw a simple pentagon outline as placeholder
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        cx, cy = size // 2, size // 2
        r = int(size * 0.42)
        import math
        pts = []
        for i in range(5):
            angle = math.radians(-90 + i * 72)
            pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
        draw.polygon(pts, outline=(108, 92, 231, 255))
        out = os.path.join(OUT_DIR, f"icon-{size}.png")
        img.save(out)
        print(f"Generated placeholder {out}")

if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    try:
        generate_with_cairosvg()
    except ImportError:
        try:
            generate_with_pillow()
        except ImportError:
            print("ERROR: Neither cairosvg nor Pillow is installed.")
            print("Install one: pip install cairosvg  OR  pip install Pillow")
            sys.exit(1)
