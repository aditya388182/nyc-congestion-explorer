"""`make demo`: build docs/demo.gif from the real screenshots in docs/demo-frames with captions."""

from PIL import Image, ImageDraw, ImageFont

from .paths import REPO

FRAMES = REPO / "docs" / "demo-frames"
CAPTIONS = {
    "01-map": "Map: each zone coloured by the change in trips after the toll; treated zones outlined",
    "02-zone-panel": "Click a zone (or pick it from the list): weekly trips with the 5 Jan 2025 start marked",
    "03-estimate-excluded": "Exclude a zone and the API re-runs the regression live in TypeScript",
    "04-estimate-fhvhv": "Change trip type or control group: a new estimate, with its compute time",
    "05-placebo": "Pick a fake start date: a placebo estimate on pre-toll weeks only",
    "06-event-study": "Event study with the joint pre-trend tests printed under the chart",
    "07-method": "Data & Method: reconciliation with zero unexplained rows, design and limits",
}
SECONDS = 2.6


def main() -> None:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 17)
    out: list[Image.Image] = []
    for name, cap in CAPTIONS.items():
        im = Image.open(FRAMES / f"{name}.png").convert("RGB")
        bar = 44
        canvas = Image.new("RGB", (im.width, im.height + bar), (17, 24, 39))
        canvas.paste(im, (0, 0))
        ImageDraw.Draw(canvas).text((14, im.height + 11), cap, font=font, fill=(255, 255, 255))
        out.append(canvas.quantize(colors=128, method=Image.Quantize.MEDIANCUT))
    out[0].save(
        REPO / "docs" / "demo.gif",
        save_all=True,
        append_images=out[1:],
        duration=int(SECONDS * 1000),
        loop=0,
        optimize=True,
    )
    print(f"docs/demo.gif: {len(out)} frames")


if __name__ == "__main__":
    main()
