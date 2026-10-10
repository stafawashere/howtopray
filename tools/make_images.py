import sys
from PIL import Image, ImageDraw, ImageFont

out_dir = sys.argv[1]
SCALE = 4

BG = (15, 21, 18)
INK = (236, 230, 214)
MUTED = (170, 167, 153)
GOLD = (212, 176, 106)
GREEN = (31, 107, 90)
WHITE = (255, 255, 255)

FIGURES = {
  "takbir": {"body": [(50, 31), (50, 95), (41, 95)], "arm": [(50, 35), (41, 46), (38, 23)], "head": (51, 17)},
  "qiyam": {"body": [(50, 31), (50, 95), (41, 95)], "arm": [(50, 35), (54, 52), (40, 45)], "head": (49, 18)},
  "ruku": {"body": [(33, 57), (67, 57), (67, 95), (58, 95)], "arm": [(37, 59), (64, 77)], "head": (19, 58)},
  "itidal": {"body": [(50, 31), (50, 95), (41, 95)], "arm": [(51, 35), (55, 50), (56, 64)], "head": (51, 17)},
  "sujud": {"body": [(87, 95), (81, 86), (63, 92), (68, 63), (40, 79)], "arm": [(41, 80), (46, 91), (34, 95)], "head": (25, 86.5)},
  "jalsa": {"body": [(63, 51), (66, 80), (33, 89), (35, 95), (70, 95)], "arm": [(63, 55), (60, 70), (44, 81)], "head": (61, 36)},
  "tashahhud": {"body": [(63, 51), (66, 80), (33, 89), (35, 95), (70, 95)], "arm": [(63, 55), (60, 70), (44, 81)], "head": (61, 36), "finger": [(41, 80), (30, 76)]},
}

ORDER = ["takbir", "qiyam", "ruku", "itidal", "sujud", "jalsa", "sujud", "tashahhud"]


def stroke_polyline(draw, points, width, color):
  radius = width / 2

  for start, end in zip(points, points[1:]):
    draw.line([start, end], fill=color, width=round(width))

  for x, y in points:
    draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=color)


def draw_figure(draw, name, origin, size, ink, background):
  figure = FIGURES[name]
  unit = size / 100
  ox, oy = origin

  def place(points):
    return [(ox + x * unit, oy + y * unit) for x, y in points]

  ink_width = 9 * unit
  knock_width = 16 * unit

  stroke_polyline(draw, place(figure["body"]), ink_width, ink)
  stroke_polyline(draw, place(figure["arm"]), knock_width, background)
  stroke_polyline(draw, place(figure["arm"]), ink_width, ink)

  if "finger" in figure:
    stroke_polyline(draw, place(figure["finger"]), 3.6 * unit, GOLD)

  head_x, head_y = place([figure["head"]])[0]
  head_r = 8.5 * unit
  draw.ellipse([head_x - head_r, head_y - head_r, head_x + head_r, head_y + head_r], fill=ink)


def font(path, size, index=0):
  return ImageFont.truetype(path, size * SCALE, index=index)


def make_og():
  width, height = 1200, 630
  canvas = Image.new("RGB", (width * SCALE, height * SCALE), BG)
  draw = ImageDraw.Draw(canvas)

  serif = "/System/Library/Fonts/Supplemental/Baskerville.ttc"
  title_font = font(serif, 112)
  sub_font = font(serif, 44)
  url_font = font(serif, 30)

  margin = 80 * SCALE
  draw.text((margin, 70 * SCALE), "Sujood", font=title_font, fill=INK)
  draw.text((margin, 210 * SCALE), "How to pray salah, step by step", font=sub_font, fill=INK)
  draw.text((margin, 268 * SCALE), "Every position, what to say, and audio to listen along", font=font(serif, 30), fill=MUTED)

  figure_size = 118 * SCALE
  gap = (width * SCALE - 2 * margin - 8 * figure_size) / 7
  floor_y = 520 * SCALE

  for index, name in enumerate(ORDER):
    x = margin + index * (figure_size + gap)
    draw_figure(draw, name, (x, floor_y - figure_size * 0.95), figure_size, INK, BG)

  draw.line([(margin, floor_y + 6 * SCALE), (width * SCALE - margin, floor_y + 6 * SCALE)], fill=(61, 77, 67), width=2 * SCALE)
  draw.text((margin, 552 * SCALE), "sujood.online", font=url_font, fill=GOLD)

  canvas.resize((width, height), Image.LANCZOS).save(f"{out_dir}/og.png", optimize=True)


def make_icon(size, file_name, rounded, inset):
  canvas = Image.new("RGBA", (size * SCALE, size * SCALE), (0, 0, 0, 0))
  draw = ImageDraw.Draw(canvas)
  full = size * SCALE

  if rounded:
    draw.rounded_rectangle([0, 0, full, full], radius=full * 0.14, fill=GREEN)
  else:
    draw.rectangle([0, 0, full, full], fill=GREEN)

  unit = full * (1 - 2 * inset) / 100
  offset = full * inset

  def place(points):
    return [(offset + (x - 5) * unit, offset + (y - 18) * unit) for x, y in points]

  stroke_polyline(draw, place([(86, 84), (81, 74), (62, 80), (68, 52), (40, 66)]), 11 * unit, WHITE)
  head_x, head_y = place([(27, 74)])[0]
  head_r = 9 * unit
  draw.ellipse([head_x - head_r, head_y - head_r, head_x + head_r, head_y + head_r], fill=WHITE)

  canvas.resize((size, size), Image.LANCZOS).save(f"{out_dir}/{file_name}", optimize=True)


make_og()
make_icon(192, "icon-192.png", rounded=True, inset=0)
make_icon(512, "icon-512.png", rounded=True, inset=0)
make_icon(512, "icon-maskable-512.png", rounded=False, inset=0.16)
make_icon(180, "apple-touch-icon.png", rounded=False, inset=0.04)
