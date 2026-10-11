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
h, w = tight.shape

# Upscale x4 to get smooth subpixel vector contours
upscaled = cv2.resize(tight, (w * 4, h * 4), interpolation=cv2.INTER_CUBIC)
_, bin_up = cv2.threshold(upscaled, 127, 255, cv2.THRESH_BINARY)

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
vw = w * 4
vh = h * 4

svg_universal = f'<svg viewBox="0 0 {vw} {vh}" fill="currentColor" xmlns="http://www.w3.org/2000/svg">\n  <path fill-rule="evenodd" clip-rule="evenodd" d="{path_d}"/>\n</svg>'
svg_black = f'<svg viewBox="0 0 {vw} {vh}" fill="none" xmlns="http://www.w3.org/2000/svg">\n  <path fill-rule="evenodd" clip-rule="evenodd" d="{path_d}" fill="#171513"/>\n</svg>'
svg_white = f'<svg viewBox="0 0 {vw} {vh}" fill="none" xmlns="http://www.w3.org/2000/svg">\n  <path fill-rule="evenodd" clip-rule="evenodd" d="{path_d}" fill="#FAF7F2"/>\n</svg>'

with open(r"frontend/public/branding/vaakriti-wordmark-black.svg", "w") as f:
    f.write(svg_black)
with open(r"frontend/public/branding/vaakriti-wordmark-white.svg", "w") as f:
    f.write(svg_white)
with open(r"frontend/public/branding/vaakriti-wordmark.svg", "w") as f:
    f.write(svg_universal)

# Also copy to root public for convenience
with open(r"frontend/public/vaakriti-wordmark-black.svg", "w") as f:
    f.write(svg_black)
with open(r"frontend/public/vaakriti-wordmark-white.svg", "w") as f:
    f.write(svg_white)
with open(r"frontend/public/vaakriti-wordmark.svg", "w") as f:
    f.write(svg_universal)

print(f"Generated wordmark SVGs with {len(paths)} paths.")
