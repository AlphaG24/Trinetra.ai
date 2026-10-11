import cv2
import numpy as np
import os
from PIL import Image

SOURCE_IMG_PATH = r"C:\Users\Ketan singh\.gemini\antigravity-ide\brain\d28baca9-1ad1-4d22-851d-13ba8dcb2474\.user_uploaded\media_1791435674188.png"
OUTPUT_DIR = r"c:\Users\Ketan singh\trinetra-workspace\trinetra-fresh\frontend\public"

def extract_clean_shapes():
    img = cv2.imread(SOURCE_IMG_PATH)
    # Card 1 (top-left, black on white)
    card_tl = img[30:315, 40:470]
    
    # 4x upscale using Lanczos / bicubic for ultra-fine subpixel edge tracing
    scale = 4
    h, w = card_tl.shape[:2]
    large = cv2.resize(card_tl, (w * scale, h * scale), interpolation=cv2.INTER_LANCZOS4)
    gray = cv2.cvtColor(large, cv2.COLOR_BGR2GRAY)
    
    # Bilateral smoothing to remove noise while keeping edges sharp
    filtered = cv2.bilateralFilter(gray, 9, 75, 75)
    
    # Thresholding
    _, bin_inv = cv2.threshold(filtered, 185, 255, cv2.THRESH_BINARY_INV)
    
    # Clear margins
    m = 15 * scale
    bin_inv[:m, :] = 0
    bin_inv[-m:, :] = 0
    bin_inv[:, :m] = 0
    bin_inv[:, -m:] = 0
    
    # Separate mark and text
    split_y = 216 * scale
    
    mark_img = np.zeros_like(bin_inv)
    mark_img[:split_y, :] = bin_inv[:split_y, :]
    
    text_img = np.zeros_like(bin_inv)
    text_img[split_y:, :] = bin_inv[split_y:, :]
    
    # Clean tiny speckles from mark_img
    contours, _ = cv2.findContours(mark_img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    clean_mark = np.zeros_like(mark_img)
    for c in contours:
        if cv2.contourArea(c) > 200 * (scale ** 2):
            cv2.drawContours(clean_mark, [c], -1, 255, -1)
            
    # Clean text
    contours, hier = cv2.findContours(text_img, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    clean_text = np.zeros_like(text_img)
    for i, c in enumerate(contours):
        if cv2.contourArea(c) > 50 * (scale ** 2):
            cv2.drawContours(clean_text, [c], -1, 255, -1)
            
    return clean_mark, clean_text, scale

def contour_to_svg_path(binary_mask, min_area=100, approx_epsilon=0.5):
    # Find contours with full hierarchy (outer + inner holes like in 'R')
    contours, hierarchy = cv2.findContours(binary_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    if hierarchy is None or len(contours) == 0:
        return ""
    
    path_d = []
    hierarchy = hierarchy[0]
    
    for i, cnt in enumerate(contours):
        area = cv2.contourArea(cnt)
        if area < min_area:
            continue
            
        # Optional polygon approximation for smoothing
        if approx_epsilon > 0:
            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, approx_epsilon, True)
            pts = approx.reshape(-1, 2)
        else:
            pts = cnt.reshape(-1, 2)
            
        if len(pts) < 3:
            continue
            
        subpath = f"M {pts[0][0]:.1f} {pts[0][1]:.1f} "
        for pt in pts[1:]:
            subpath += f"L {pt[0]:.1f} {pt[1]:.1f} "
        subpath += "Z"
        path_d.append(subpath)
        
    return " ".join(path_d)

def main():
    print("Extracting shapes...")
    mark_mask, text_mask, scale = extract_clean_shapes()
    
    # Crop mark mask tightly
    ys, xs = np.where(mark_mask > 0)
    m_min_x, m_max_x = np.min(xs), np.max(xs)
    m_min_y, m_max_y = np.min(ys), np.max(ys)
    
    # Crop text mask tightly
    t_ys, t_xs = np.where(text_mask > 0)
    t_min_x, t_max_x = np.min(t_xs), np.max(t_xs)
    t_min_y, t_max_y = np.min(t_ys), np.max(t_ys)
    
    print(f"Mark: x=[{m_min_x}, {m_max_x}], y=[{m_min_y}, {m_max_y}], w={m_max_x - m_min_x}, h={m_max_y - m_min_y}")
    print(f"Text: x=[{t_min_x}, {t_max_x}], y=[{t_min_y}, {t_max_y}], w={t_max_x - t_min_x}, h={t_max_y - t_min_y}")
    
    # 1. Generate Mark-only SVG (centered in square viewBox 512x512)
    m_w = m_max_x - m_min_x
    m_h = m_max_y - m_min_y
    m_cropped = mark_mask[m_min_y:m_max_y, m_min_x:m_max_x]
    
    # Fit mark into 512x512 with 40px padding
    target_box = 512
    padding = 48
    avail = target_box - 2 * padding
    ratio = avail / max(m_w, m_h)
    
    new_w = int(m_w * ratio)
    new_h = int(m_h * ratio)
    m_resized = cv2.resize(m_cropped, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
    _, m_resized_bin = cv2.threshold(m_resized, 127, 255, cv2.THRESH_BINARY)
    
    # Center on canvas
    mark_canvas = np.zeros((target_box, target_box), dtype=np.uint8)
    ox = (target_box - new_w) // 2
    oy = (target_box - new_h) // 2
    mark_canvas[oy:oy+new_h, ox:ox+new_w] = m_resized_bin
    
    mark_path_d = contour_to_svg_path(mark_canvas, min_area=50, approx_epsilon=0.6)
    
    # 2. Generate Stacked Logo (Mark on top, Text below, viewBox 600x600)
    canvas_w = 600
    canvas_h = 600
    stacked_canvas = np.zeros((canvas_h, canvas_w), dtype=np.uint8)
    
    # Desired layout:
    # Text width ~ 500, Mark width ~ 210, gap ~ 30
    desired_text_w = 480
    t_ratio = desired_text_w / (t_max_x - t_min_x)
    new_tw = int((t_max_x - t_min_x) * t_ratio)
    new_th = int((t_max_y - t_min_y) * t_ratio)
    t_resized = cv2.resize(text_mask[t_min_y:t_max_y, t_min_x:t_max_x], (new_tw, new_th), interpolation=cv2.INTER_LANCZOS4)
    _, t_resized_bin = cv2.threshold(t_resized, 127, 255, cv2.THRESH_BINARY)
    
    # Mark in stacked:
    m_ratio = t_ratio * 1.02
    new_mw = int(m_w * m_ratio)
    new_mh = int(m_h * m_ratio)
    m_stacked_resized = cv2.resize(m_cropped, (new_mw, new_mh), interpolation=cv2.INTER_LANCZOS4)
    _, m_stacked_resized_bin = cv2.threshold(m_stacked_resized, 127, 255, cv2.THRESH_BINARY)
    
    gap = 35
    total_content_h = new_mh + gap + new_th
    start_y = (canvas_h - total_content_h) // 2
    
    # Paste mark centered horizontally
    m_sx = (canvas_w - new_mw) // 2
    stacked_canvas[start_y:start_y+new_mh, m_sx:m_sx+new_mw] = m_stacked_resized_bin
    
    # Paste text centered horizontally
    t_sy = start_y + new_mh + gap
    t_sx = (canvas_w - new_tw) // 2
    stacked_canvas[t_sy:t_sy+new_th, t_sx:t_sx+new_tw] = t_resized_bin
    
    stacked_path_d = contour_to_svg_path(stacked_canvas, min_area=30, approx_epsilon=0.6)
    
    # 3. Generate Horizontal Lockup (Mark on left, Text on right, viewBox 800x200)
    h_canvas_w = 800
    h_canvas_h = 200
    h_canvas = np.zeros((h_canvas_h, h_canvas_w), dtype=np.uint8)
    
    h_mark_h = 140
    hm_ratio = h_mark_h / m_h
    hm_w = int(m_w * hm_ratio)
    hm_resized = cv2.resize(m_cropped, (hm_w, h_mark_h), interpolation=cv2.INTER_LANCZOS4)
    _, hm_bin = cv2.threshold(hm_resized, 127, 255, cv2.THRESH_BINARY)
    
    ht_h = int((t_max_y - t_min_y) * hm_ratio * 1.05)
    ht_w = int((t_max_x - t_min_x) * hm_ratio * 1.05)
    ht_resized = cv2.resize(text_mask[t_min_y:t_max_y, t_min_x:t_max_x], (ht_w, ht_h), interpolation=cv2.INTER_LANCZOS4)
    _, ht_bin = cv2.threshold(ht_resized, 127, 255, cv2.THRESH_BINARY)
    
    h_gap = 40
    h_total_w = hm_w + h_gap + ht_w
    h_start_x = (h_canvas_w - h_total_w) // 2
    
    hm_oy = (h_canvas_h - h_mark_h) // 2
    h_canvas[hm_oy:hm_oy+h_mark_h, h_start_x:h_start_x+hm_w] = hm_bin
    
    ht_oy = (h_canvas_h - ht_h) // 2
    ht_ox = h_start_x + hm_w + h_gap
    h_canvas[ht_oy:ht_oy+ht_h, ht_ox:ht_ox+ht_w] = ht_bin
    
    h_path_d = contour_to_svg_path(h_canvas, min_area=30, approx_epsilon=0.6)
    
    # Save the canvas masks as test PNGs
    cv2.imwrite("scratch_mark_canvas.png", mark_canvas)
    cv2.imwrite("scratch_stacked_canvas.png", stacked_canvas)
    cv2.imwrite("scratch_h_canvas.png", h_canvas)
    
    # Save SVG strings for later use
    os.makedirs("generated_svgs", exist_ok=True)
    
    # 1. Mark only
    with open("generated_svgs/symbol-black.svg", "w") as f:
        f.write(f'''<svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" clip-rule="evenodd" d="{mark_path_d}" fill="#080010"/>
</svg>''')
    with open("generated_svgs/symbol-white.svg", "w") as f:
        f.write(f'''<svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" clip-rule="evenodd" d="{mark_path_d}" fill="#FFFFFF"/>
</svg>''')
        
    # 2. Stacked (with name)
    with open("generated_svgs/logo-stacked-black.svg", "w") as f:
        f.write(f'''<svg viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" clip-rule="evenodd" d="{stacked_path_d}" fill="#080010"/>
</svg>''')
    with open("generated_svgs/logo-stacked-white.svg", "w") as f:
        f.write(f'''<svg viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" clip-rule="evenodd" d="{stacked_path_d}" fill="#FFFFFF"/>
</svg>''')

    # 3. Horizontal lockup
    with open("generated_svgs/logo-horizontal-black.svg", "w") as f:
        f.write(f'''<svg viewBox="0 0 800 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" clip-rule="evenodd" d="{h_path_d}" fill="#080010"/>
</svg>''')
    with open("generated_svgs/logo-horizontal-white.svg", "w") as f:
        f.write(f'''<svg viewBox="0 0 800 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" clip-rule="evenodd" d="{h_path_d}" fill="#FFFFFF"/>
</svg>''')

    print("All SVGs and raster masks generated!")

if __name__ == "__main__":
    main()
