#!/usr/bin/env python3
"""Baja fotos de referencia con licencia abierta para el catálogo (ADR-043).

No es una compuerta: corre a mano cuando hay que reponer un archivo. La
compuerta es `npm run check:fotos`.
"""

from __future__ import annotations

import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SQL = ROOT / "docs/sql/catalogo-casa-basica.sql"
OUT_DIR = ROOT / "public/fotos/catalogo"
UA = "LaCasaDeNormaCatalog/1.0 (https://github.com/justomiguel/Lacasadenorma)"
MAX_EDGE = 1280
JPEG_QUALITY = 82
FIXTURE_TITLE = "Chapas del techo (datos de desarrollo)"
FIXTURE_ALIAS_OF = "Chapas de techo"

SEARCHES: dict[str, str] = {
    "Ladrillos comunes": "clay bricks",
    "Ladrillos huecos 18x18x33": "hollow bricks",
    "Cemento": "cement bags",
    "Cal hidratada": "lime bags",
    "Arena": "construction sand",
    "Ripio": "gravel pile",
    "Hidrófugo": "waterproofing",
    "Chapas de techo": "corrugated roof",
    "Cerámico de piso": "floor tiles",
    "Azulejos de cocina": "kitchen tiles",
    "Azulejos de baño": "bathroom tiles",
    "Pintura": "paint buckets",
    "Hierro para estructura": "rebar steel",
    "Tirantes de techo": "roof beams",
    "Cielorraso": "ceiling panels",
    "Zócalos": "baseboard",
    "Enduido": "wall plaster",
    "Clavos y alambre": "construction nails",
    "Puerta de entrada": "front door",
    "Puertas interiores": "interior door",
    "Ventanas": "house window",
    "Rejas": "window bars",
    "Portón": "metal gate",
    "Tanque de agua": "water tank",
    "Bomba de agua": "water pump",
    "Cámara séptica": "septic tank",
    "Inodoro": "toilet",
    "Bidet": "bidet",
    "Tina": "bathtub",
    "Receptáculo de ducha": "shower tray",
    "Lavatorio": "bathroom sink",
    "Vanitory": "bathroom vanity",
    "Pileta de cocina": "kitchen sink",
    "Mesada de cocina": "kitchen counter",
    "Grifería de baño": "bathroom faucet",
    "Grifería de cocina": "kitchen faucet",
    "Mampara": "shower screen",
    "Extractor de baño": "bathroom fan",
    "Caños de agua": "water pipes",
    "Caños de desagüe": "drain pipes",
    "Caños de gas": "gas pipes",
    "Garrafa y regulador": "gas cylinder",
    "Cable eléctrico": "electrical cable",
    "Llaves y tomacorrientes": "light switch",
    "Tablero eléctrico": "breaker panel",
    "Accesorios de baño": "towel rack",
    "Cocina": "kitchen stove",
    "Heladera": "refrigerator",
    "Lavarropas": "washing machine",
    "Ventiladores": "pedestal fan",
    "Calefón o termotanque": "water heater",
    "Plancha": "clothes iron",
    "Microondas": "microwave",
    "Pava eléctrica": "electric kettle",
    "Campana extractora": "range hood",
    "Cama plaza y media": "bed frame",
    "Colchón plaza y media": "mattress",
    "Ropero": "wardrobe",
    "Mesa de luz": "nightstand",
    "Mesa de cocina": "kitchen table",
    "Sillas": "wooden chair",
    "Sillón de dos cuerpos": "sofa",
    "Mesa ratona": "coffee table",
    "Bajo mesada": "kitchen cabinet",
    "Alacena": "kitchen cupboard",
    "Banqueta de cocina": "kitchen stool",
    "Juego de ollas": "cooking pots",
    "Sartenes": "frying pan",
    "Vajilla": "dinner plates",
    "Cubiertos": "cutlery",
    "Vasos y jarra": "drinking glasses",
    "Utensilios de cocina": "kitchen utensils",
    "Tabla para picar": "cutting board",
    "Almohadas": "bed pillows",
    "Sábanas plaza y media": "bed sheets",
    "Acolchado": "quilt",
    "Toallas": "bath towels",
    "Cortina de baño": "shower curtain",
    "Espejo de baño": "bathroom mirror",
    "Cortinas": "curtains",
    "Tender": "drying rack",
    "Balde y lampazo": "mop bucket",
    "Escoba y palita": "broom",
    "Lámparas": "light bulbs",
    "Zapatillas eléctricas": "power strip",
    "Perchas": "clothes hangers",
}

CAPTION_ES = "Foto solamente ilustrativa. No representa el objeto real."
CAPTION_EN = "Illustrative photo only. It does not represent the actual item."
ALT_ES = "Foto ilustrativa de {title}."
ALT_EN = "Illustrative photo of {title}."


def titles_from_sql() -> list[str]:
    text = SQL.read_text()
    return re.findall(r"\(\d+,\s*'[a-z_]+',\s*'([^']+)'", text)


def slug_for(title: str) -> str:
    slug = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode()
    slug = slug.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


def request_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=45) as response:
        return json.loads(response.read().decode())


def request_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as response:
        return response.read()


def openverse_candidates(query: str) -> list[dict]:
    params = urllib.parse.urlencode(
        {
            "q": query,
            "license": "cc0,pdm,by,by-sa",
            "page_size": "20",
        }
    )
    data = request_json(f"https://api.openverse.org/v1/images/?{params}")
    return list(data.get("results") or [])


def wikimedia_candidates(query: str) -> list[dict]:
    params = urllib.parse.urlencode(
        {
            "action": "query",
            "generator": "search",
            "gsrsearch": query,
            "gsrnamespace": "6",
            "gsrlimit": "12",
            "prop": "imageinfo",
            "iiprop": "url|size|mime|extmetadata",
            "iiurlwidth": str(MAX_EDGE),
            "format": "json",
        }
    )
    data = request_json(f"https://commons.wikimedia.org/w/api.php?{params}")
    pages = (data.get("query") or {}).get("pages") or {}
    page_list = pages if isinstance(pages, list) else list(pages.values())
    out: list[dict] = []
    for page in page_list:
        info = (page.get("imageinfo") or [None])[0]
        if not info:
            continue
        mime = info.get("mime") or ""
        if not mime.startswith("image/") or mime.endswith("svg+xml"):
            continue
        if mime not in {"image/jpeg", "image/jpg", "image/png"}:
            continue
        meta = info.get("extmetadata") or {}
        artist = ((meta.get("Artist") or {}).get("value") or "").strip()
        artist = re.sub(r"<[^>]+>", "", artist)
        license_short = ((meta.get("LicenseShortName") or {}).get("value") or "").strip()
        out.append(
            {
                "id": f"wm-{page.get('pageid')}",
                "url": info.get("thumburl") or info.get("url"),
                "width": info.get("thumbwidth") or info.get("width") or 0,
                "creator": artist or "Wikimedia Commons",
                "license": license_short or "CC",
                "source": "Wikimedia Commons",
                "title": page.get("title") or "",
                "mime": mime,
            }
        )
    return out


def to_openverse_like(item: dict, source: str) -> dict:
    creator = item.get("creator") or source
    license_code = (item.get("license") or "cc").upper()
    tags = " ".join(tag.get("name") or "" for tag in item.get("tags") or [])
    return {
        "id": item["id"],
        "url": item["url"],
        "width": item.get("width") or 0,
        "creator": creator,
        "license": license_code,
        "source": source,
        "title": f"{item.get('title') or ''} {tags}",
        "mime": f"image/{item.get('filetype') or 'jpeg'}",
    }


SKIP_TITLE = re.compile(
    r"advert|poster|postcard|flyer|stamp|cuneiform|museum|pdf|circular of",
    re.I,
)


def acceptable(item: dict) -> bool:
    title = item.get("title") or ""
    if SKIP_TITLE.search(title):
        return False
    mime = (item.get("mime") or "").lower()
    if mime and mime not in {"image/jpeg", "image/jpg", "image/png"}:
        return False
    return True


def save_jpeg(payload: bytes, dest: Path) -> tuple[int, int]:
    image = Image.open(BytesIO(payload))
    image = image.convert("RGB")
    image.thumbnail((MAX_EDGE, MAX_EDGE))
    dest.parent.mkdir(parents=True, exist_ok=True)
    image.save(dest, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return image.size


def credit_line(item: dict) -> str:
    creator = (item.get("creator") or "").strip() or item["source"]
    license_code = item.get("license") or "CC"
    return f"{creator}, vía {item['source']} ({license_code})"


def pick_and_download(title: str, used_ids: set[str]) -> dict:
    query = SEARCHES[title]
    fallback = query.split()[0]
    queries = [query] if query == fallback else [query, fallback]
    errors: list[str] = []
    for current in queries:
        sources = [
            ("Wikimedia Commons", lambda q=current: wikimedia_candidates(q)),
            (
                "Openverse",
                lambda q=current: [
                    to_openverse_like(row, "Openverse") for row in openverse_candidates(q)
                ],
            ),
        ]
        for source_name, loader in sources:
            try:
                candidates = loader()
            except Exception as error:  # noqa: BLE001 — se prueba la fuente siguiente
                errors.append(f"{source_name} ({current}): {error}")
                continue
            for item in candidates:
                if item["id"] in used_ids:
                    continue
                if not item.get("url"):
                    continue
                if not acceptable(item):
                    continue
                try:
                    payload = request_bytes(item["url"])
                    slug = slug_for(title)
                    dest = OUT_DIR / f"{slug}.jpg"
                    width, height = save_jpeg(payload, dest)
                except Exception as error:  # noqa: BLE001
                    errors.append(f"{source_name} {item['id']}: {error}")
                    continue
                used_ids.add(item["id"])
                return {
                    "url": f"/fotos/catalogo/{slug}.jpg",
                    "width": width,
                    "height": height,
                    "credit": credit_line(item),
                }
            time.sleep(0.2)
    raise RuntimeError(f"sin foto para {title}: {'; '.join(errors) or 'sin candidatos'}")


def main() -> None:
    titles = titles_from_sql()
    missing_queries = [title for title in titles if title not in SEARCHES]
    extra_queries = [title for title in SEARCHES if title not in titles]
    if missing_queries or extra_queries:
        raise SystemExit(
            f"SEARCHES no coincide con el SQL. Faltan {missing_queries}. "
            f"Sobran {extra_queries}."
        )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    used_ids: set[str] = set()
    es: dict[str, dict] = {}
    en: dict[str, dict] = {}

    for index, title in enumerate(titles, start=1):
        print(f"[{index}/{len(titles)}] {title}", flush=True)
        photo = pick_and_download(title, used_ids)
        es[title] = {
            "url": photo["url"],
            "alt": ALT_ES.format(title=title),
            "caption": CAPTION_ES.format(title=title),
            "credit": photo["credit"],
            "width": photo["width"],
            "height": photo["height"],
            "takenOn": None,
        }
        en[title] = {
            "url": photo["url"],
            "alt": ALT_EN.format(title=title),
            "caption": CAPTION_EN.format(title=title),
            "credit": photo["credit"],
            "width": photo["width"],
            "height": photo["height"],
            "takenOn": None,
        }
        time.sleep(0.2)

    chapas = es[FIXTURE_ALIAS_OF]
    es[FIXTURE_TITLE] = {
        **chapas,
        "alt": ALT_ES.format(title=FIXTURE_TITLE),
        "caption": CAPTION_ES.format(title=FIXTURE_TITLE),
    }
    en[FIXTURE_TITLE] = {
        **en[FIXTURE_ALIAS_OF],
        "alt": ALT_EN.format(title=FIXTURE_TITLE),
        "caption": CAPTION_EN.format(title=FIXTURE_TITLE),
    }

    (ROOT / "content/es/catalogo-fotos.json").write_text(
        json.dumps(es, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (ROOT / "content/en/catalogo-fotos.json").write_text(
        json.dumps(en, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"listo: {len(es)} fichas, {len(list(OUT_DIR.glob('*.jpg')))} archivos")


if __name__ == "__main__":
    main()
