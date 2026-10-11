import cv2
import numpy as np
import os
from PIL import Image

SOURCE_IMG_PATH = r"C:\Users\Ketan singh\.gemini\antigravity-ide\brain\d28baca9-1ad1-4d22-851d-13ba8dcb2474\.user_uploaded\media_1791435674188.png"
PUBLIC_DIR = r"c:\Users\Ketan singh\trinetra-workspace\trinetra-fresh\frontend\public"
BRANDING_DIR = os.path.join(PUBLIC_DIR, "branding")

def extract_highres_components():
    img = cv2.imread(SOURCE_IMG_PATH)
    
    # 1. Extract Mark from top-left card
    # Mark region: y in [32, 250], x in [115, 325]
    mark_roi = img[32:250, 115:325]
    m_gray = cv2.cvtColor(mark_roi, cv2.COLOR_BGR2GRAY)
    m_filt = cv2.bilateralFilter(m_gray, 5, 50, 50)
    m_bin = ((m_filt < 215).astype(np.uint8)) * 255
    m_bin[:5, :] = 0
    m_bin[-5:, :] = 0
    m_bin[:, :5] = 0
    m_bin[:, -5:] = 0
    
    # Crop mark tightly
    mys, mxs = np.where(m_bin > 0)
    tight_mark = m_bin[np.min(mys):np.max(mys)+1, np.min(mxs):np.max(mxs)+1]
    
    # 2. Extract Text from top-left card
    # Text region: y in [245, 295], x in [45, 465]
    text_roi = img[245:295, 45:465]
    t_gray = cv2.cvtColor(text_roi, cv2.COLOR_BGR2GRAY)
    t_filt = cv2.bilateralFilter(t_gray, 5, 50, 50)
    t_bin = ((t_filt < 215).astype(np.uint8)) * 255
    t_bin[:3, :] = 0
    t_bin[-3:, :] = 0
    t_bin[:, :3] = 0
    t_bin[:, -3:] = 0
    
    tys, txs = np.where(t_bin > 0)
    tight_text = t_bin[np.min(tys):np.max(tys)+1, np.min(txs):np.max(txs)+1]
    
    return tight_mark, tight_text

def smooth_upscale_mask(mask, target_w, target_h):
    # Upscale mask with Lanczos then apply smooth antialiasing
    pil_mask = Image.fromarray(mask).convert('L')
    resized = pil_mask.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    # Convert to smooth alpha map with slight blur for vector-like anti-aliased edges
    arr = np.array(resized).astype(np.float32) / 255.0
    arr = cv2.GaussianBlur(arr, (3, 3), 0.5)
    arr = np.clip(arr * 1.05, 0.0, 1.0)
    return (arr * 255).astype(np.uint8)

def contour_to_svg_path(mask, approx_eps=0.7):
    # Convert binary mask to SVG path with hole support
    _, bin_mask = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
    contours, hier = cv2.findContours(bin_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    if hier is None or len(contours) == 0:
        return ""
    
    path_d = []
    for cnt in contours:
        if cv2.contourArea(cnt) < 15:
            continue
        approx = cv2.approxPolyDP(cnt, approx_eps, True)
        pts = approx.reshape(-1, 2)
        if len(pts) < 3:
            continue
        sub = f"M {pts[0][0]} {pts[0][1]} " + " ".join([f"L {p[0]} {p[1]}" for p in pts[1:]]) + " Z"
        path_d.append(sub)
    return " ".join(path_d)

def create_rgba_image(alpha_mask, color_rgb):
    # alpha_mask is uint8 (0-255)
    h, w = alpha_mask.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, 0] = color_rgb[0]
    rgba[:, :, 1] = color_rgb[1]
    rgba[:, :, 2] = color_rgb[2]
    rgba[:, :, 3] = alpha_mask
    return Image.fromarray(rgba, 'RGBA')

def create_solid_image(alpha_mask, fg_rgb, bg_rgb):
    h, w = alpha_mask.shape
    fg = np.full((h, w, 3), fg_rgb, dtype=np.float32)
    bg = np.full((h, w, 3), bg_rgb, dtype=np.float32)
    a = (alpha_mask.astype(np.float32) / 255.0)[:, :, None]
    out = (fg * a + bg * (1.0 - a)).astype(np.uint8)
    return Image.fromarray(out, 'RGB')

def main():
    os.makedirs(BRANDING_DIR, exist_ok=True)
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    
    tight_mark, tight_text = extract_highres_components()
    tm_h, tm_w = tight_mark.shape
    tt_h, tt_w = tight_text.shape
    
    print(f"Extracted Mark: {tm_w}x{tm_h}, Text: {tt_w}x{tt_h}")
    
    # =========================================================================
    # MASTER 1: SYMBOL ONLY (Canvas 1024 x 1024)
    # =========================================================================
    sym_size = 1024
    pad = 120
    avail_s = sym_size - 2 * pad
    s_scale = avail_s / max(tm_w, tm_h)
    new_sw = int(tm_w * s_scale)
    new_sh = int(tm_h * s_scale)
    
    sym_upscaled = smooth_upscale_mask(tight_mark, new_sw, new_sh)
    sym_canvas = np.zeros((sym_size, sym_size), dtype=np.uint8)
    sox = (sym_size - new_sw) // 2
    soy = (sym_size - new_sh) // 2
    sym_canvas[soy:soy+new_sh, sox:sox+new_sw] = sym_upscaled
    
    sym_path_d = contour_to_svg_path(sym_canvas, approx_eps=0.8)
    
    # =========================================================================
    # MASTER 2: STACKED LOGO (Symbol + Name, Canvas 1200 x 1200)
    # =========================================================================
    st_size = 1200
    st_tw = 960
    t_scale = st_tw / tt_w
    st_th = int(tt_h * t_scale)
    
    st_mw = int(tm_w * t_scale * 1.05)
    st_mh = int(tm_h * t_scale * 1.05)
    
    m_st_up = smooth_upscale_mask(tight_mark, st_mw, st_mh)
    t_st_up = smooth_upscale_mask(tight_text, st_tw, st_th)
    
    st_gap = 70
    total_st_h = st_mh + st_gap + st_th
    st_start_y = (st_size - total_st_h) // 2
    
    st_canvas = np.zeros((st_size, st_size), dtype=np.uint8)
    st_mox = (st_size - st_mw) // 2
    st_canvas[st_start_y:st_start_y+st_mh, st_mox:st_mox+st_mw] = m_st_up
    
    st_toy = st_start_y + st_mh + st_gap
    st_tox = (st_size - st_tw) // 2
    st_canvas[st_toy:st_toy+st_th, st_tox:st_tox+st_tw] = t_st_up
    
    stacked_path_d = contour_to_svg_path(st_canvas, approx_eps=0.8)
    
    # =========================================================================
    # MASTER 3: HORIZONTAL LOGO (Symbol on Left, Name on Right, Canvas 1600 x 400)
    # =========================================================================
    hz_w = 1600
    hz_h = 400
    hz_mh = 270
    hz_ms = hz_mh / tm_h
    hz_mw = int(tm_w * hz_ms)
    
    hz_th = int(tt_h * hz_ms * 1.08)
    hz_tw = int(tt_w * hz_ms * 1.08)
    
    m_hz_up = smooth_upscale_mask(tight_mark, hz_mw, hz_mh)
    t_hz_up = smooth_upscale_mask(tight_text, hz_tw, hz_th)
    
    hz_gap = 75
    total_hz_w = hz_mw + hz_gap + hz_tw
    hz_start_x = (hz_w - total_hz_w) // 2
    
    hz_canvas = np.zeros((hz_h, hz_w), dtype=np.uint8)
    hz_moy = (hz_h - hz_mh) // 2
    hz_canvas[hz_moy:hz_moy+hz_mh, hz_start_x:hz_start_x+hz_mw] = m_hz_up
    
    hz_toy = (hz_h - hz_th) // 2
    hz_tox = hz_start_x + hz_mw + hz_gap
    hz_canvas[hz_toy:hz_toy+hz_th, hz_tox:hz_tox+hz_tw] = t_hz_up
    
    hz_path_d = contour_to_svg_path(hz_canvas, approx_eps=0.8)
    
    print("Writing SVG Files...")
    # -------------------------------------------------------------------------
    # SVGs (Vector, Infinite Resolution)
    # -------------------------------------------------------------------------
    svg_configs = [
        # Symbol Only (Black & White)
        ("vaakriti-symbol-black.svg", sym_size, sym_size, sym_path_d, "#080010"),
        ("vaakriti-symbol-white.svg", sym_size, sym_size, sym_path_d, "#FFFFFF"),
        ("vaakriti-symbol.svg", sym_size, sym_size, sym_path_d, "#080010"),
        ("favicon.svg", sym_size, sym_size, sym_path_d, "#080010"),
        
        # Stacked Logo (Black & White)
        ("vaakriti-logo-black.svg", st_size, st_size, stacked_path_d, "#080010"),
        ("vaakriti-logo-white.svg", st_size, st_size, stacked_path_d, "#FFFFFF"),
        ("vaakriti-logo.svg", st_size, st_size, stacked_path_d, "#080010"),
        
        # Horizontal Logo (Black & White)
        ("vaakriti-horizontal-black.svg", hz_w, hz_h, hz_path_d, "#080010"),
        ("vaakriti-horizontal-white.svg", hz_w, hz_h, hz_path_d, "#FFFFFF"),
    ]
    
    for filename, vw, vh, path_data, fill_color in svg_configs:
        svg_code = f'''<svg viewBox="0 0 {vw} {vh}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" clip-rule="evenodd" d="{path_data}" fill="{fill_color}"/>
</svg>'''
        with open(os.path.join(PUBLIC_DIR, filename), "w", encoding="utf-8") as f:
            f.write(svg_code)
        with open(os.path.join(BRANDING_DIR, filename), "w", encoding="utf-8") as f:
            f.write(svg_code)
            
    # -------------------------------------------------------------------------
    # PNGs in All Standard Resolutions & Variants
    # -------------------------------------------------------------------------
    print("Generating PNG Variants and Sizes...")
    
    # 1. Symbol Only PNGs
    sym_img_black = create_rgba_image(sym_canvas, (8, 0, 16))
    sym_img_white = create_rgba_image(sym_canvas, (255, 255, 255))
    sym_solid_black_on_white = create_solid_image(sym_canvas, (8, 0, 16), (255, 255, 255))
    sym_solid_white_on_black = create_solid_image(sym_canvas, (255, 255, 255), (8, 0, 16))
    
    # 2. Stacked Logo PNGs
    st_img_black = create_rgba_image(st_canvas, (8, 0, 16))
    st_img_white = create_rgba_image(st_canvas, (255, 255, 255))
    st_solid_black_on_white = create_solid_image(st_canvas, (8, 0, 16), (255, 255, 255))
    st_solid_white_on_black = create_solid_image(st_canvas, (255, 255, 255), (8, 0, 16))
    
    # 3. Horizontal Logo PNGs
    hz_img_black = create_rgba_image(hz_canvas, (8, 0, 16))
    hz_img_white = create_rgba_image(hz_canvas, (255, 255, 255))
    hz_solid_black_on_white = create_solid_image(hz_canvas, (8, 0, 16), (255, 255, 255))
    hz_solid_white_on_black = create_solid_image(hz_canvas, (255, 255, 255), (8, 0, 16))
    
    # Master full-res exports in public/branding/
    sym_img_black.save(os.path.join(BRANDING_DIR, "symbol-black-transparent.png"))
    sym_img_white.save(os.path.join(BRANDING_DIR, "symbol-white-transparent.png"))
    sym_solid_black_on_white.save(os.path.join(BRANDING_DIR, "symbol-black-on-white.png"))
    sym_solid_white_on_black.save(os.path.join(BRANDING_DIR, "symbol-white-on-black.png"))
    
    st_img_black.save(os.path.join(BRANDING_DIR, "logo-stacked-black-transparent.png"))
    st_img_white.save(os.path.join(BRANDING_DIR, "logo-stacked-white-transparent.png"))
    st_solid_black_on_white.save(os.path.join(BRANDING_DIR, "logo-stacked-black-on-white.png"))
    st_solid_white_on_black.save(os.path.join(BRANDING_DIR, "logo-stacked-white-on-black.png"))
    
    hz_img_black.save(os.path.join(BRANDING_DIR, "logo-horizontal-black-transparent.png"))
    hz_img_white.save(os.path.join(BRANDING_DIR, "logo-horizontal-white-transparent.png"))
    hz_solid_black_on_white.save(os.path.join(BRANDING_DIR, "logo-horizontal-black-on-white.png"))
    hz_solid_white_on_black.save(os.path.join(BRANDING_DIR, "logo-horizontal-white-on-black.png"))
    
    # Standard resolution sizes for icons & marks:
    standard_sizes = [16, 32, 48, 64, 128, 180, 192, 256, 512, 1024]
    
    for sz in standard_sizes:
        sym_img_black.resize((sz, sz), Image.Resampling.LANCZOS).save(
            os.path.join(BRANDING_DIR, f"symbol-black-{sz}x{sz}.png")
        )
        sym_img_white.resize((sz, sz), Image.Resampling.LANCZOS).save(
            os.path.join(BRANDING_DIR, f"symbol-white-{sz}x{sz}.png")
        )
        st_img_black.resize((sz, sz), Image.Resampling.LANCZOS).save(
            os.path.join(BRANDING_DIR, f"logo-stacked-black-{sz}x{sz}.png")
        )
        st_img_white.resize((sz, sz), Image.Resampling.LANCZOS).save(
            os.path.join(BRANDING_DIR, f"logo-stacked-white-{sz}x{sz}.png")
        )

    # Horizontal logo in standard widths:
    for w in [300, 500, 800, 1200, 1600]:
        h = int(w * (hz_h / hz_w))
        hz_img_black.resize((w, h), Image.Resampling.LANCZOS).save(
            os.path.join(BRANDING_DIR, f"logo-horizontal-black-{w}w.png")
        )
        hz_img_white.resize((w, h), Image.Resampling.LANCZOS).save(
            os.path.join(BRANDING_DIR, f"logo-horizontal-white-{w}w.png")
        )

    # -------------------------------------------------------------------------
    # System Replacement in public/ (Current Logo Replacements)
    # -------------------------------------------------------------------------
    # 1. trident.png -> Replace with high-res symbol (white on transparent, works with existing dark mode & dynamic-logo filter)
    sym_img_white.resize((512, 512), Image.Resampling.LANCZOS).save(
        os.path.join(PUBLIC_DIR, "trident.png")
    )
    
    # 2. logo-transparent.png -> Horizontal Logo (white text & symbol)
    hz_img_white.resize((800, 200), Image.Resampling.LANCZOS).save(
        os.path.join(PUBLIC_DIR, "logo-transparent.png")
    )
    hz_img_black.resize((800, 200), Image.Resampling.LANCZOS).save(
        os.path.join(PUBLIC_DIR, "logo-transparent-dark.png")
    )
    
    # 3. Favicon and app icon replacements
    sym_img_black.resize((16, 16), Image.Resampling.LANCZOS).save(
        os.path.join(PUBLIC_DIR, "favicon-16x16.png")
    )
    sym_img_black.resize((32, 32), Image.Resampling.LANCZOS).save(
        os.path.join(PUBLIC_DIR, "favicon-32x32.png")
    )
    sym_img_black.resize((48, 48), Image.Resampling.LANCZOS).save(
        os.path.join(PUBLIC_DIR, "favicon-48x48.png")
    )
    sym_img_black.resize((64, 64), Image.Resampling.LANCZOS).save(
        os.path.join(PUBLIC_DIR, "favicon-64x64.png")
    )
    sym_img_black.resize((128, 128), Image.Resampling.LANCZOS).save(
        os.path.join(PUBLIC_DIR, "favicon-128x128.png")
    )
    sym_img_black.resize((180, 180), Image.Resampling.LANCZOS).save(
        os.path.join(PUBLIC_DIR, "favicon-180x180.png")
    )
    sym_img_black.resize((180, 180), Image.Resampling.LANCZOS).save(
        os.path.join(PUBLIC_DIR, "apple-touch-icon.png")
    )
    sym_img_black.resize((192, 192), Image.Resampling.LANCZOS).save(
        os.path.join(PUBLIC_DIR, "favicon-192x192.png")
    )
    sym_img_black.resize((192, 192), Image.Resampling.LANCZOS).save(
        os.path.join(PUBLIC_DIR, "icon-192.png")
    )
    sym_img_black.resize((512, 512), Image.Resampling.LANCZOS).save(
        os.path.join(PUBLIC_DIR, "favicon-512x512.png")
    )
    sym_img_black.resize((512, 512), Image.Resampling.LANCZOS).save(
        os.path.join(PUBLIC_DIR, "icon-512.png")
    )

    print("ALL ASSETS RE-GENERATED FLAWLESSLY!")

if __name__ == "__main__":
    main()
