from __future__ import annotations

import base64
import argparse
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO
from pathlib import Path
from urllib.request import urlopen

from PIL import Image, ImageOps


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ROUTER_ROOT = PROJECT_ROOT.parent / "api_router"
DEFAULT_PROMPTS_PATH = PROJECT_ROOT / "docs" / "application-route-image-prompts.json"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "public" / "assets" / "application-routes"

sys.path.insert(0, str(ROUTER_ROOT))

from api_router import GeneratedImage, LLMRouter  # noqa: E402


def image_bytes(image: GeneratedImage) -> bytes:
    if image.url.startswith("data:"):
        return base64.b64decode(image.url.split(",", 1)[1])
    with urlopen(image.url, timeout=120) as response:
        return response.read()


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate KPL application artwork from a prompt manifest.")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_PROMPTS_PATH)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--width", type=int, default=1280)
    parser.add_argument("--height", type=int, default=800)
    args = parser.parse_args()

    prompts_path = args.manifest if args.manifest.is_absolute() else PROJECT_ROOT / args.manifest
    output_dir = args.output_dir if args.output_dir.is_absolute() else PROJECT_ROOT / args.output_dir
    output_size = (args.width, args.height)
    prompts = json.loads(prompts_path.read_text(encoding="utf-8"))
    router = LLMRouter(ROUTER_ROOT / "config" / "llm_router.json")
    output_dir.mkdir(parents=True, exist_ok=True)

    def generate(index: int, item: dict[str, str]) -> str:
        output_path = output_dir / item["filename"]
        if output_path.exists():
            return f"[{index:02d}/{len(prompts):02d}] Kept {output_path.name}"
        print(f"[{index:02d}/{len(prompts):02d}] Generating {item['label']}...", flush=True)
        time.sleep(((index - 1) % 5) * 0.3)
        for attempt in range(4):
            try:
                generated = router.generate_image(
                    item["prompt"],
                    image_size="1K",
                    aspect_ratio="16:10",
                    timeout=300,
                )
                break
            except ValueError as error:
                if "(429)" not in str(error) or attempt == 3:
                    raise
                delay = 2 ** (attempt + 1)
                print(f"[{index:02d}/{len(prompts):02d}] Rate limited; retrying in {delay}s...", flush=True)
                time.sleep(delay)
        with Image.open(BytesIO(image_bytes(generated))) as source:
            final = ImageOps.fit(source.convert("RGB"), output_size, method=Image.Resampling.LANCZOS)
            final.save(output_path, format="JPEG", quality=90, optimize=True)
        return f"[{index:02d}/{len(prompts):02d}] Saved {output_path.name}"

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(generate, index, item) for index, item in enumerate(prompts, start=1)]
        for future in as_completed(futures):
            print(future.result(), flush=True)


if __name__ == "__main__":
    main()
