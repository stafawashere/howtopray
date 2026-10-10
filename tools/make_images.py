import math
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


def draw_mark(draw, origin, full, rounded, inset):
  ox, oy = origin
  box = [ox, oy, ox + full, oy + full]

  if rounded:
    draw.rounded_rectangle(box, radius=full * 0.14, fill=GREEN)
  else:
    draw.rectangle(box, fill=GREEN)

  unit = full * (1 - 2 * inset) / 100
  offset = full * inset

  def place(points):
    return [(ox + offset + (x - 5) * unit, oy + offset + (y - 18) * unit) for x, y in points]

  stroke_polyline(draw, place([(86, 84), (81, 74), (62, 80), (68, 52), (40, 66)]), 11 * unit, WHITE)
  head_x, head_y = place([(27, 74)])[0]
  head_r = 9 * unit
  draw.ellipse([head_x - head_r, head_y - head_r, head_x + head_r, head_y + head_r], fill=WHITE)


def make_icon(size, file_name, rounded, inset):
  canvas = Image.new("RGBA", (size * SCALE, size * SCALE), (0, 0, 0, 0))
  draw = ImageDraw.Draw(canvas)
  draw_mark(draw, (0, 0), size * SCALE, rounded, inset)

  canvas.resize((size, size), Image.LANCZOS).save(f"{out_dir}/{file_name}", optimize=True)


def pointed_arch(left, right, spring_y, floor_y, steps=60):
  width = right - left
  radius = width * 0.62
  left_side = []

  for step in range(steps + 1):
    x = left + (width / 2) * step / steps
    rise = max(0, radius ** 2 - (x - (left + radius)) ** 2) ** 0.5
    left_side.append((x, spring_y - rise))

  right_side = [(2 * left + width - x, y) for x, y in reversed(left_side)]
  return [(left, floor_y)] + left_side + right_side[1:] + [(right, floor_y)]


def star_points(cx, cy, outer, inner):
  points = []

  for index in range(16):
    angle = math.pi / 8 * index - math.pi / 2
    radius = outer if index % 2 == 0 else inner
    points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))

  return points


def girih_layer(size, tile, color, alpha):
  layer = Image.new("RGBA", size, (0, 0, 0, 0))
  draw = ImageDraw.Draw(layer)
  stroke = (*color, alpha)
  line_width = max(2, round(tile / 70))
  unit = tile / 96
  octagram = [(78, 48), (69.2, 56.8), (69.2, 69.2), (56.8, 69.2), (48, 78), (39.2, 69.2), (26.8, 69.2), (26.8, 56.8), (18, 48), (26.8, 39.2), (26.8, 26.8), (39.2, 26.8), (48, 18), (56.8, 26.8), (69.2, 26.8), (69.2, 39.2)]

  for row in range(int(size[1] / tile) + 2):
    for column in range(int(size[0] / tile) + 2):
      ox, oy = column * tile, row * tile

      def place(points):
        return [(ox + x * unit, oy + y * unit) for x, y in points]

      draw.polygon(place(octagram), outline=stroke, width=line_width)

      for spoke in [[(0, 48), (18, 48)], [(78, 48), (96, 48)], [(48, 0), (48, 18)], [(48, 78), (48, 96)]]:
        draw.line(place(spoke), fill=stroke, width=line_width)

  return layer


def make_banner(file_name, palette):
  width, height = 1600, 600
  full_width, full_height = width * SCALE, height * SCALE
  canvas = Image.new("RGBA", (full_width, full_height), (*palette["background"], 255))

  pattern = girih_layer((full_width, full_height), 84 * SCALE, palette["gold"], palette["pattern_alpha"])
  edge_mask = Image.radial_gradient("L").resize((full_width, full_height))
  faded_alpha = Image.eval(pattern.getchannel("A"), lambda value: value)
  faded_alpha = Image.composite(faded_alpha, Image.new("L", faded_alpha.size, 0), edge_mask)
  pattern.putalpha(faded_alpha)
  canvas = Image.alpha_composite(canvas, pattern)
  draw = ImageDraw.Draw(canvas)

  gold = palette["gold"]
  frame_inset = 22 * SCALE
  frame_gap = 7 * SCALE

  for inset, line_width in [(frame_inset, 2), (frame_inset + frame_gap, 1)]:
    draw.rectangle([inset, inset, full_width - inset, full_height - inset], outline=gold, width=line_width * SCALE)

  corner_offset = frame_inset + frame_gap / 2
  corners = [(corner_offset, corner_offset), (full_width - corner_offset, corner_offset), (corner_offset, full_height - corner_offset), (full_width - corner_offset, full_height - corner_offset)]

  for cx, cy in corners:
    draw.polygon(star_points(cx, cy, 15 * SCALE, 7 * SCALE), fill=palette["background"], outline=gold, width=2 * SCALE)
    draw.ellipse([cx - 3 * SCALE, cy - 3 * SCALE, cx + 3 * SCALE, cy + 3 * SCALE], fill=gold)

  serif = "/System/Library/Fonts/Supplemental/Baskerville.ttc"
  title_font = font(serif, 116)
  tagline_font = font(serif, 32)
  arabic_font = font("/System/Library/Fonts/GeezaPro.ttc", 52)
  title = "Sujood"
  tagline = "How to pray salah, step by step"
  arabic = "\uFEA9\uFEEE\uFEA0\uFEB3"

  mark_size = 150 * SCALE
  mark_gap = 46 * SCALE
  title_box = draw.textbbox((0, 0), title, font=title_font)
  tagline_box = draw.textbbox((0, 0), tagline, font=tagline_font)
  arabic_box = draw.textbbox((0, 0), arabic, font=arabic_font)
  title_width = title_box[2] - title_box[0]
  arabic_width = arabic_box[2] - arabic_box[0]
  tagline_width = tagline_box[2] - tagline_box[0]
  title_row_width = title_width + 34 * SCALE + arabic_width
  text_width = max(title_row_width, tagline_width)

  group_left = (full_width - (mark_size + mark_gap + text_width)) / 2
  mark_top = 86 * SCALE
  draw_mark(draw, (group_left, mark_top), mark_size, rounded=True, inset=0)

  text_left = group_left + mark_size + mark_gap
  title_top = mark_top - 4 * SCALE
  draw.text((text_left - title_box[0], title_top - title_box[1]), title, font=title_font, fill=palette["ink"])

  title_baseline = title_top + (title_box[3] - title_box[1]) * 0.78
  arabic_left = text_left + title_width + 34 * SCALE
  arabic_top = title_baseline - (arabic_box[3] - arabic_box[1]) * 0.72
  draw.text((arabic_left - arabic_box[0], arabic_top - arabic_box[1]), arabic, font=arabic_font, fill=gold)

  tagline_top = mark_top + mark_size - (tagline_box[3] - tagline_box[1]) - 4 * SCALE
  draw.text((text_left - tagline_box[0], tagline_top - tagline_box[1]), tagline, font=tagline_font, fill=palette["muted"])

  arch_width = 132 * SCALE
  arch_gap = 26 * SCALE
  arcade_width = 8 * arch_width + 7 * arch_gap
  arcade_left = (full_width - arcade_width) / 2
  floor_y = 526 * SCALE
  spring_y = floor_y - 104 * SCALE
  figure_size = 122 * SCALE
  head_points = []

  for index, name in enumerate(ORDER):
    left = arcade_left + index * (arch_width + arch_gap)
    right = left + arch_width
    outline = pointed_arch(left, right, spring_y, floor_y)
    draw.polygon(outline, fill=palette["niche"])
    draw.line(outline, fill=gold, width=2 * SCALE, joint="curve")

    apex_x, apex_y = outline[len(outline) // 2]
    draw.polygon(star_points(apex_x, apex_y - 15 * SCALE, 8 * SCALE, 3.6 * SCALE), fill=gold)

    figure_left = left + (arch_width - figure_size) / 2
    figure_top = floor_y - figure_size * 0.95
    draw_figure(draw, name, (figure_left, figure_top), figure_size, palette["ink"], palette["niche"])

    head_x, head_y = FIGURES[name]["head"]
    head_points.append((figure_left + head_x * figure_size / 100, figure_top + head_y * figure_size / 100))

  for index in range(7):
    spandrel_x = arcade_left + (index + 1) * (arch_width + arch_gap) - arch_gap / 2
    draw.polygon(star_points(spandrel_x, spring_y - 40 * SCALE, 10 * SCALE, 4.6 * SCALE), outline=gold, width=round(1.5 * SCALE))

  dot_radius = 2.2 * SCALE
  dot_spacing = 11 * SCALE

  for start, end in zip(head_points, head_points[1:]):
    span_x, span_y = end[0] - start[0], end[1] - start[1]
    span = (span_x ** 2 + span_y ** 2) ** 0.5
    head_clearance = 14 * SCALE
    dot_count = int((span - 2 * head_clearance) / dot_spacing)

    for step in range(dot_count + 1):
      distance = head_clearance + step * (span - 2 * head_clearance) / max(dot_count, 1)
      x = start[0] + span_x * distance / span
      y = start[1] + span_y * distance / span
      draw.ellipse([x - dot_radius, y - dot_radius, x + dot_radius, y + dot_radius], fill=palette["path"])

  floor_rule_y = floor_y + 6 * SCALE
  rule_margin = arcade_left - 40 * SCALE
  draw.line([(rule_margin, floor_rule_y), (full_width - rule_margin, floor_rule_y)], fill=gold, width=2 * SCALE)
  draw.line([(rule_margin, floor_rule_y + 6 * SCALE), (full_width - rule_margin, floor_rule_y + 6 * SCALE)], fill=gold, width=1 * SCALE)

  for end_x in [rule_margin, full_width - rule_margin]:
    draw.polygon(star_points(end_x, floor_rule_y + 3 * SCALE, 9 * SCALE, 4 * SCALE), fill=gold)

  canvas.convert("RGB").resize((width, height), Image.LANCZOS).save(f"{out_dir}/{file_name}", optimize=True)


make_og()
make_icon(192, "icon-192.png", rounded=True, inset=0)
make_icon(512, "icon-512.png", rounded=True, inset=0)
make_icon(512, "icon-maskable-512.png", rounded=False, inset=0.16)
make_icon(180, "apple-touch-icon.png", rounded=False, inset=0.04)
make_banner("banner-dark.png", {"background": BG, "niche": (26, 34, 29), "ink": INK, "muted": MUTED, "gold": GOLD, "path": (154, 130, 82), "pattern_alpha": 34})
make_banner("banner-light.png", {"background": (244, 236, 220), "niche": (250, 245, 234), "ink": (30, 41, 34), "muted": (110, 104, 88), "gold": (138, 106, 30), "path": (176, 150, 96), "pattern_alpha": 40})
