#!/usr/bin/env python3
"""Baja fotos de referencia con licencia abierta para el catálogo (ADR-043).

No es una compuerta: corre a mano cuando hay que reponer un archivo. La
compuerta es `npm run check:fotos`.
"""

from __future__ import annotations

import json
import re
import time
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
FIXTURE_ALIAS_OF = "Chapa trapezoidal aluminizada calibre 25"
GENERATED_CREDIT_ES = "Imagen de referencia generada"
GENERATED_CREDIT_EN = "Generated reference image"

# Título del SQL → archivo en public/fotos/catalogo/. Varios títulos
# pueden compartir foto cuando el tipo es el mismo (tres diámetros de
# hierro, cuatro secciones de cable).
PHOTO_FILES: dict[str, str] = {
    "Ladrillo hueco cerámico 18x18x33": "ladrillos-huecos-18x18x33.jpg",
    "Cemento 50 kg": "cemento.jpg",
    "Cal hidratada 25 kg": "cal-hidratada.jpg",
    "Arena mediana lavada": "arena.jpg",
    "Ripio / piedra partida": "ripio.jpg",
    "Hidrófugo": "hidrofugo.jpg",
    "Membrana / barrera hidrófuga": "membrana-hidrofuga.jpg",
    "Malla electrosoldada SIMA": "malla-electrosoldada.jpg",
    "Hierro ADN 8 mm x 12 m": "hierro-para-estructura.jpg",
    "Hierro ADN 10 mm x 12 m": "hierro-para-estructura.jpg",
    "Hierro ADN 12 mm x 12 m": "hierro-para-estructura.jpg",
    "Alambre de atar": "clavos-y-alambre.jpg",
    "Madera / fenólico para encofrado": "encofrado-fenolico.jpg",
    "Chapa trapezoidal aluminizada calibre 25": "chapas-de-techo.jpg",
    "Estructura de techo / perfiles galvanizados": "perfiles-galvanizados.jpg",
    "Aislante térmico aluminizado para techo": "aislante-termico-aluminizado.jpg",
    "Tornillos autoperforantes con arandela": "tornillos-autoperforantes.jpg",
    "Cumbreras y babetas": "cumbreras-babetas.jpg",
    "Canaletas pluviales": "canaletas-pluviales.jpg",
    "Bajadas pluviales": "bajadas-pluviales.jpg",
    "Cielorraso": "cielorraso.jpg",
    "Cerámico de piso": "ceramico-de-piso.jpg",
    "Adhesivo para cerámicos 30 kg": "adhesivo-ceramicos.jpg",
    "Pastina": "pastina.jpg",
    "Revestimiento cerámico baños": "azulejos-de-bano.jpg",
    "Revestimiento cerámico cocina": "azulejos-de-cocina.jpg",
    "Zócalos": "zocalos.jpg",
    "Enduido interior": "enduido.jpg",
    "Fijador sellador": "fijador-sellador.jpg",
    "Pintura látex interior": "pintura.jpg",
    "Pintura exterior impermeable": "pintura-exterior.jpg",
    "Impermeabilizante para baños y cocina": "impermeabilizante.jpg",
    "Puerta principal de aluminio reforzada": "puerta-de-entrada.jpg",
    "Puertas interiores": "puertas-interiores.jpg",
    "Ventanas de aluminio con vidrio": "ventanas.jpg",
    "Ventiluces de baño": "ventiluz-bano.jpg",
    "Mosquiteros": "mosquiteros.jpg",
    "Rejas de seguridad": "rejas.jpg",
    "Cerraduras y herrajes": "cerraduras-herrajes.jpg",
    "Tanque de agua 1000 litros": "tanque-de-agua.jpg",
    "Base y conexiones para tanque": "base-tanque.jpg",
    "Bomba presurizadora / elevadora": "bomba-de-agua.jpg",
    "Caño termofusión agua fría/caliente": "canos-de-agua.jpg",
    "Accesorios termofusión y llaves de paso": "accesorios-termofusion.jpg",
    "Caño PVC cloacal y desagües": "canos-de-desague.jpg",
    "Accesorios PVC cloacal": "accesorios-pvc-cloacal.jpg",
    "Cámara séptica / biodigestor": "camara-septica.jpg",
    "Cámaras de inspección": "camaras-inspeccion.jpg",
    "Inodoro con mochila": "inodoro.jpg",
    "Bidet": "bidet.jpg",
    "Vanitory con lavatorio": "vanitory.jpg",
    "Grifería de lavatorio": "griferia-de-bano.jpg",
    "Ducha completa con grifería": "ducha-completa.jpg",
    "Mampara de ducha": "mampara.jpg",
    "Extractor de baño": "extractor-de-bano.jpg",
    "Accesorios de baño": "accesorios-de-bano.jpg",
    "Pileta de cocina acero inoxidable": "pileta-de-cocina.jpg",
    "Grifería monocomando cocina": "griferia-de-cocina.jpg",
    "Mesada de cocina": "mesada-de-cocina.jpg",
    "Pileta de lavadero": "pileta-lavadero.jpg",
    "Grifería de lavadero": "griferia-de-cocina.jpg",
    "Termotanque eléctrico 80 litros": "calefon-o-termotanque.jpg",
    "Cable 1,5 mm²": "cable-electrico.jpg",
    "Cable 2,5 mm²": "cable-electrico.jpg",
    "Cable 4 mm²": "cable-electrico.jpg",
    "Cable 6 mm²": "cable-electrico.jpg",
    "Caño corrugado eléctrico": "cano-corrugado-electrico.jpg",
    "Cajas eléctricas": "cajas-electricas.jpg",
    "Llaves y tomacorrientes": "llaves-y-tomacorrientes.jpg",
    "Tablero eléctrico modular": "tablero-electrico.jpg",
    "Interruptor diferencial 30 mA": "interruptor-diferencial.jpg",
    "Termomagnéticas": "termomagneticas.jpg",
    "Protector de sobretensión": "protector-sobretension.jpg",
    "Puesta a tierra completa": "puesta-a-tierra.jpg",
    "Luminarias LED interiores": "lamparas.jpg",
    "Luminarias LED exteriores": "luminarias-led-exteriores.jpg",
    "Bajo mesada de cocina": "bajo-mesada.jpg",
    "Alacena de cocina": "alacena.jpg",
    "Placard dormitorio principal": "ropero.jpg",
    "Placard segundo dormitorio": "ropero.jpg",
    "Heladera con freezer 300 litros": "heladera.jpg",
    "Cocina a gas 4 hornallas con horno": "cocina.jpg",
    "Lavarropas automático": "lavarropas.jpg",
    "Aire acondicionado split 3000 frigorías": "aire-acondicionado-split.jpg",
    "Aire acondicionado split 4500 frigorías": "aire-acondicionado-split.jpg",
    "Ventiladores de techo": "ventiladores-techo.jpg",
    "Microondas": "microondas.jpg",
    "Pava eléctrica": "pava-electrica.jpg",
    "Campana / extractor de cocina": "campana-extractora.jpg",
    "Cama matrimonial": "cama-plaza-y-media.jpg",
    "Colchón matrimonial": "colchon-plaza-y-media.jpg",
    "Mesas de luz": "mesa-de-luz.jpg",
    "Cama segundo dormitorio": "cama-plaza-y-media.jpg",
    "Colchón segundo dormitorio": "colchon-plaza-y-media.jpg",
    "Mesa comedor 6 personas": "mesa-de-cocina.jpg",
    "Sillas comedor": "sillas.jpg",
    "Sillón 3 cuerpos": "sillon-de-dos-cuerpos.jpg",
    "Sillón individual": "sillon-individual.jpg",
    "Mesa ratona": "mesa-ratona.jpg",
    "Mueble TV / guardado living": "mueble-tv.jpg",
    "Mesa exterior / galería": "mesa-exterior.jpg",
    "Sillas exterior": "sillas-exterior.jpg",
    "Juego de ollas": "juego-de-ollas.jpg",
    "Sartenes": "sartenes.jpg",
    "Vajilla 6 personas": "vajilla.jpg",
    "Cubiertos 6 personas": "cubiertos.jpg",
    "Vasos y jarra": "vasos-y-jarra.jpg",
    "Utensilios de cocina": "utensilios-de-cocina.jpg",
    "Sábanas cama matrimonial": "sabanas-plaza-y-media.jpg",
    "Sábanas segundo dormitorio": "sabanas-plaza-y-media.jpg",
    "Almohadas": "almohadas.jpg",
    "Acolchados / frazadas": "acolchado.jpg",
    "Toallas": "toallas.jpg",
    "Espejos de baño": "espejo-de-bano.jpg",
    "Cortinas / blackout": "cortinas.jpg",
    "Tender": "tender.jpg",
    "Elementos de limpieza": "elementos-limpieza.jpg",
    "Matafuego ABC 5 kg": "matafuego-abc.jpg",
    "Detector de humo": "detector-humo.jpg",
    "Botiquín doméstico": "botiquin-domestico.jpg",
}

SEARCHES: dict[str, str] = {
    filename: filename.removesuffix(".jpg").replace("-", " ")
    for filename in set(PHOTO_FILES.values())
}

CAPTION_ES = "Foto solamente ilustrativa. No representa el objeto real."
CAPTION_EN = "Illustrative photo only. It does not represent the actual item."
ALT_ES = "Foto ilustrativa de {title}."
ALT_EN = "Illustrative photo of {title}."


def titles_from_sql() -> list[str]:
    text = SQL.read_text()
    return re.findall(r"\(\d+,\s*'[a-z_]+',\s*'([^']+)'", text)


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


def jpeg_size(path: Path) -> tuple[int, int]:
    with Image.open(path) as image:
        return image.size


def pick_and_download(filename: str, used_ids: set[str]) -> dict:
    dest = OUT_DIR / filename
    if dest.exists():
        width, height = jpeg_size(dest)
        return {
            "url": f"/fotos/catalogo/{filename}",
            "width": width,
            "height": height,
            "credit": GENERATED_CREDIT_ES,
        }

    query = SEARCHES[filename]
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
                    width, height = save_jpeg(payload, dest)
                except Exception as error:  # noqa: BLE001
                    errors.append(f"{source_name} {item['id']}: {error}")
                    continue
                used_ids.add(item["id"])
                return {
                    "url": f"/fotos/catalogo/{filename}",
                    "width": width,
                    "height": height,
                    "credit": credit_line(item),
                }
            time.sleep(0.2)
    raise RuntimeError(f"sin foto para {filename}: {'; '.join(errors) or 'sin candidatos'}")


def main() -> None:
    titles = titles_from_sql()
    missing_files = [title for title in titles if title not in PHOTO_FILES]
    extra_files = [title for title in PHOTO_FILES if title not in titles]
    if missing_files or extra_files:
        raise SystemExit(
            f"PHOTO_FILES no coincide con el SQL. Faltan {missing_files}. "
            f"Sobran {extra_files}."
        )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    used_ids: set[str] = set()
    photos_by_file: dict[str, dict] = {}
    es: dict[str, dict] = {}
    en: dict[str, dict] = {}

    unique_files = list(dict.fromkeys(PHOTO_FILES[title] for title in titles))
    for index, filename in enumerate(unique_files, start=1):
        print(f"[{index}/{len(unique_files)}] {filename}", flush=True)
        photos_by_file[filename] = pick_and_download(filename, used_ids)
        time.sleep(0.2)

    for title in titles:
        photo = photos_by_file[PHOTO_FILES[title]]
        credit_en = (
            GENERATED_CREDIT_EN
            if photo["credit"] == GENERATED_CREDIT_ES
            else photo["credit"]
        )
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
            "credit": credit_en,
            "width": photo["width"],
            "height": photo["height"],
            "takenOn": None,
        }

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
