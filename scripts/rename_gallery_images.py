#!/usr/bin/env python3
"""
Renombra fotos según el orden visual de infinite-galeria en el sitio original.
Extrae .infinite-galeria .galeria-gal-columns img (masonry) con Puppeteer.

Orden visual en la web original: primera arriba → última abajo al cargar todo.
Renombrado invertido para la nueva web:
  - última en la original (abajo) → 001_
  - primera en la original (arriba) → nnn_
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GALLERIES_ROOT = ROOT / "assets" / "images" / "galleries"
EXTRACT_SCRIPT = ROOT / "scripts" / "extract_infinite_gallery_order.mjs"

GALLERY_URL_SLUGS = {
    "bodas": "bodas",
    "albumes-impresos": "albumes-impresos",
    "book": "book",
    "erotic-photography": "erotic-photography",
    "celebridades": "celebridades",
    "publicidad": "publicidad",
    "viajes": "viajes",
    "ninos": "nin-s",
    "producto": "producto",
    "retratos-de-familia": "retratos-de-familia",
}

PREFIX_PATTERN = re.compile(r"^\d{3}_")
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def extract_visual_order(slug: str) -> list[dict]:
    result = subprocess.run(
        ["node", str(EXTRACT_SCRIPT), slug],
        capture_output=True,
        text=True,
        cwd=str(ROOT),
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"Error extrayendo orden ({slug}):\n{result.stderr or result.stdout}"
        )
    data = json.loads(result.stdout)
    return data["order"]


def strip_prefix(filename: str) -> str:
    return PREFIX_PATTERN.sub("", filename)


def find_local_file(gallery_dir: Path, url_name: str) -> Path | None:
    for ext in IMAGE_EXTENSIONS:
        candidate = gallery_dir / f"{url_name}{ext}"
        if candidate.is_file():
            return candidate

    for path in gallery_dir.iterdir():
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        base_name = strip_prefix(path.name)
        if base_name == f"{url_name}{path.suffix}" or Path(base_name).stem == url_name:
            return path
    return None


def rename_gallery(slug: str, dry_run: bool = False) -> dict:
    gallery_dir = GALLERIES_ROOT / slug
    if not gallery_dir.is_dir():
        raise FileNotFoundError(gallery_dir)

    visual_order = extract_visual_order(slug)
    total = len(visual_order)
    if total == 0:
        return {"slug": slug, "renamed": 0, "errors": ["sin imágenes en infinite-galeria"]}

    plans: list[tuple[Path, Path]] = []
    errors: list[str] = []

    for idx, item in enumerate(visual_order):
        url_name = item.get("url_name")
        if not url_name:
            errors.append(f"item {idx}: sin url_name")
            continue

        prefix_num = total - idx
        prefix = f"{prefix_num:03d}_"

        src = find_local_file(gallery_dir, url_name)
        if src is None:
            errors.append(f"no encontrado: {url_name}")
            continue

        dest = gallery_dir / f"{prefix}{url_name}{src.suffix.lower()}"
        if src.name != dest.name:
            plans.append((src, dest))

    if dry_run:
        return {
            "slug": slug,
            "total_visual": total,
            "would_rename": len(plans),
            "first_visual": visual_order[0]["url_name"],
            "last_visual": visual_order[-1]["url_name"],
            "sample": [(a.name, b.name) for a, b in plans[:3]],
            "errors": errors,
        }

    temp_moves: list[tuple[Path, Path]] = []
    for i, (src, dest) in enumerate(plans):
        temp = gallery_dir / f"__renaming_{i:04d}{src.suffix.lower()}"
        temp_moves.append((src, temp))

    for src, temp in temp_moves:
        src.rename(temp)
    for (_, temp), (_, dest) in zip(temp_moves, plans):
        temp.rename(dest)

    return {
        "slug": slug,
        "total_visual": total,
        "renamed": len(plans),
        "first_visual": visual_order[0]["url_name"],
        "last_visual": visual_order[-1]["url_name"],
        "errors": errors,
    }


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    slugs = [s for s in sys.argv[1:] if not s.startswith("-")] or list(
        GALLERY_URL_SLUGS.keys()
    )

    print("Fuente: infinite-galeria (DOM masonry)")
    print("Modo:", "simulación" if dry_run else "renombrar")

    for slug in slugs:
        if slug not in GALLERY_URL_SLUGS:
            print(f"Slug desconocido: {slug}", file=sys.stderr)
            return 1
        print(f"\n=== {slug} ===")
        try:
            result = rename_gallery(slug, dry_run=dry_run)
            print(json.dumps(result, indent=2, ensure_ascii=False))
            if result.get("errors"):
                return 1
        except Exception as exc:
            print(f"ERROR: {exc}", file=sys.stderr)
            return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
