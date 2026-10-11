import cv2
import numpy as np

img_path = r"C:\Users\Ketan singh\.gemini\antigravity-ide\brain\d28baca9-1ad1-4d22-851d-13ba8dcb2474\.user_uploaded\media_1791435674188.png"
img = cv2.imread(img_path)
t_roi = img[245:295, 45:465]
t_gray = cv2.cvtColor(t_roi, cv2.COLOR_BGR2GRAY)
t_filt = cv2.bilateralFilter(t_gray, 5, 50, 50)
t_bin = ((t_filt < 210).astype(np.uint8)) * 255
t_bin[:3, :] = 0
t_bin[-3:, :] = 0
t_bin[:, :3] = 0
t_bin[:, -3:] = 0

ys, xs = np.where(t_bin > 0)
tight = t_bin[np.min(ys):np.max(ys)+1, np.min(xs):np.max(xs)+1]

num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(tight)
components = []
for i in range(1, num_labels):
    x, y, w, h, area = stats[i]
    if area > 30:
        components.append((x, y, w, h, area, i))
components.sort(key=lambda c: c[0])

# Extract letter masks
letter_masks = []
for (x, y, w, h, area, label_idx) in components:
    letter_mask = (labels[y:y+h, x:x+w] == label_idx).astype(np.uint8) * 255
    letter_masks.append((letter_mask, y))

# Reduced gap between letters: 9px (down from original ~22px)
gap = 9
total_w = sum(m.shape[1] for m, _ in letter_masks) + gap * (len(letter_masks) - 1)
max_h = 41
canvas = np.zeros((max_h, total_w), dtype=np.uint8)

curr_x = 0
for mask, y_offset in letter_masks:
    mh, mw = mask.shape
    canvas[y_offset:y_offset+mh, curr_x:curr_x+mw] = mask
    curr_x += mw + gap

# Upscale x4 with cubic interpolation for smooth vector contours
vw = total_w * 4
vh = max_h * 4
upscaled = cv2.resize(canvas, (vw, vh), interpolation=cv2.INTER_CUBIC)
_, bin_up = cv2.threshold(upscaled, 127, 255, cv2.THRESH_BINARY)

# Find contours with hierarchy so inner hole of R is preserved
contours, hier = cv2.findContours(bin_up, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_KCOS)

paths = []
for cnt in contours:
    if cv2.contourArea(cnt) < 40:
        continue
    approx = cv2.approxPolyDP(cnt, 1.2, True)
    pts = approx.reshape(-1, 2)
    if len(pts) < 3:
        continue
    sub = f"M {pts[0][0]} {pts[0][1]} " + " ".join([f"L {p[0]} {p[1]}" for p in pts[1:]]) + " Z"
    paths.append(sub)

path_d = " ".join(paths)
print(f"Total contours/paths: {len(paths)}, ViewBox: 0 0 {vw} {vh}")

svg_universal = f'<svg viewBox="0 0 {vw} {vh}" fill="currentColor" xmlns="http://www.w3.org/2000/svg">\n  <path fill-rule="evenodd" clip-rule="evenodd" d="{path_d}"/>\n</svg>'
svg_black = f'<svg viewBox="0 0 {vw} {vh}" fill="none" xmlns="http://www.w3.org/2000/svg">\n  <path fill-rule="evenodd" clip-rule="evenodd" d="{path_d}" fill="#171513"/>\n</svg>'
svg_white = f'<svg viewBox="0 0 {vw} {vh}" fill="none" xmlns="http://www.w3.org/2000/svg">\n  <path fill-rule="evenodd" clip-rule="evenodd" d="{path_d}" fill="#FAF7F2"/>\n</svg>'

for target_dir in [r"frontend/public", r"frontend/public/branding"]:
    import os
    with open(os.path.join(target_dir, "vaakriti-wordmark.svg"), "w") as f:
        f.write(svg_universal)
    with open(os.path.join(target_dir, "vaakriti-wordmark-black.svg"), "w") as f:
        f.write(svg_black)
    with open(os.path.join(target_dir, "vaakriti-wordmark-white.svg"), "w") as f:
        f.write(svg_white)

# Update VaakritiWordmark.tsx component
component_code = f'''import React from "react";

interface VaakritiWordmarkProps extends React.SVGProps<SVGSVGElement> {{
  className?: string;
}}

/**
 * VaakritiWordmark - Precision vector wordmark with balanced letter-spacing.
 * Uses `currentColor` for seamless dynamic theming and hover transitions.
 */
export function VaakritiWordmark({{ className, ...props }}: VaakritiWordmarkProps) {{
  return (
    <svg
      viewBox="0 0 {vw} {vh}"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="VAAKRITI"
      role="img"
      className={{className}}
      {{...props}}
    >
      <title>VAAKRITI</title>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="{path_d}"
      />
    </svg>
  );
}}
'''

with open(r"frontend/src/components/ui/VaakritiWordmark.tsx", "w") as f:
    f.write(component_code)

print("Updated VaakritiWordmark.tsx and all SVG files with tighter spacing!")
