import os, subprocess
from PIL import Image, ImageDraw

frames_dir = r'C:\Users\namsi\.gemini\antigravity\brain\6e7b794e-936f-471b-a47d-ad4c8877b523\scratch\video_frames'
os.makedirs(frames_dir, exist_ok=True)
base_img = r'C:\Users\namsi\.gemini\antigravity\brain\6e7b794e-936f-471b-a47d-ad4c8877b523\vayux_live_map.png'

im = Image.open(base_img).convert('RGB')
w, h = im.size

print('Generating interactive walkthrough video frames...')

for idx in range(120):
    frame = im.copy()
    draw = ImageDraw.Draw(frame)
    
    if idx < 25:
        # Phase 1: Intro
        pass
    elif idx < 60:
        # Phase 2: 72h Timeline Slider morphing
        progress = (idx - 25) / 35.0
        hour = int(progress * 72)
        slider_x = int(w * 0.35 + progress * (w * 0.30))
        draw.rectangle([slider_x - 8, h - 90, slider_x + 8, h - 50], fill=(234, 179, 8))
        draw.text((slider_x - 30, h - 120), f'+{hour}h Forecast', fill=(234, 179, 8))
    elif idx < 85:
        # Phase 3: Policy Sandbox Simulation
        draw.rectangle([20, h - 280, 360, h - 50], outline=(6, 182, 212), width=3)
        draw.text((40, h - 260), 'SIMULATING GRAP STAGE 4: -28.4% PM2.5', fill=(16, 185, 129))
    else:
        # Phase 4: Jarvis Voice Co-Pilot Dialog
        orb_x, orb_y = w - 80, h - 80
        draw.ellipse([orb_x - 35, orb_y - 35, orb_x + 35, orb_y + 35], outline=(6, 182, 212), width=4)
        draw.rectangle([w - 460, h - 340, w - 40, h - 120], fill=(2, 6, 23), outline=(6, 182, 212), width=2)
        draw.text((w - 440, h - 320), 'VAYUX JARVIS VOICE CO-PILOT (Gemini 3.5)', fill=(6, 182, 212))
        draw.text((w - 440, h - 280), 'User: Why is Anand Vihar AQI severe tonight?', fill=(226, 232, 240))
        draw.text((w - 440, h - 240), 'JARVIS: Boundary layer height compressed to 353m', fill=(56, 189, 248))
        draw.text((w - 440, h - 215), 'with 2.4 m/s NW winds trapping stubble smoke.', fill=(56, 189, 248))
        draw.text((w - 440, h - 170), 'Status: Real-time Audio Stream Active (24kHz PCM)', fill=(52, 211, 153))

    frame_path = os.path.join(frames_dir, f'frame_{idx:04d}.png')
    frame.save(frame_path)

out_video = r'C:\Users\namsi\.gemini\antigravity\brain\6e7b794e-936f-471b-a47d-ad4c8877b523\vayux_interactive_demo.mp4'
cmd = [
    'ffmpeg', '-y', '-framerate', '20',
    '-i', os.path.join(frames_dir, 'frame_%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    out_video
]
res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
print('Video generation status:', res.returncode)
print('Video created at:', out_video, 'Size:', os.path.getsize(out_video) if os.path.exists(out_video) else 0)
