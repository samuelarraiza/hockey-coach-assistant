#!/usr/bin/env python3
"""Genera una pizarra de hockey interactiva (HTML) a partir de un JSON de ejercicios.

Uso:
    python render.py entrada.json salida.html

El JSON puede ser una sesión ({"titulo": ..., "ejercicios": [...]})
o un único ejercicio ({"titulo": ..., "vista": ..., "elementos": [...]}).
"""
import json
import pathlib
import sys

TEMPLATE = pathlib.Path(__file__).resolve().parent.parent / "assets" / "pizarra.html"
PLACEHOLDER = "/*__DATA__*/null"

TIPOS = {"jugador", "disco", "cono", "porteria", "texto", "trayectoria"}
EQUIPOS = {"propio", "rival", "portero", "entrenador"}
ESTILOS = {"patinaje", "pase", "tiro", "conduccion", "atras", "parada"}


def check_point(x, y, where, errors, warnings, vista):
    if not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
        errors.append(f"{where}: coordenadas no numéricas ({x!r}, {y!r})")
        return
    if not (-30 <= x <= 30 and -15 <= y <= 15):
        errors.append(f"{where}: ({x}, {y}) fuera de la pista (x entre -30 y 30, y entre -15 y 15)")
    elif vista == "media" and x < 0:
        warnings.append(f"{where}: x={x} queda fuera de la vista de media pista (usa x entre 0 y 30)")


def validate(data):
    errors, warnings = [], []
    ejercicios = data.get("ejercicios")
    if not isinstance(ejercicios, list) or not ejercicios:
        errors.append("Falta la lista 'ejercicios' o está vacía")
        return errors, warnings
    for n, ex in enumerate(ejercicios, 1):
        nombre = f"Ejercicio {n} ({ex.get('titulo', 'sin título')})"
        vista = ex.get("vista", "entera")
        if vista not in ("entera", "media"):
            errors.append(f"{nombre}: 'vista' debe ser 'entera' o 'media'")
        elementos = ex.get("elementos", [])
        if not isinstance(elementos, list):
            errors.append(f"{nombre}: 'elementos' debe ser una lista")
            continue
        if not elementos:
            warnings.append(f"{nombre}: sin elementos; se mostrará la pista vacía (en el PDF, sin diagrama)")
        posiciones = []
        for k, it in enumerate(elementos, 1):
            where = f"{nombre}, elemento {k}"
            tipo = it.get("tipo")
            if tipo not in TIPOS:
                errors.append(f"{where}: tipo desconocido {tipo!r} (válidos: {', '.join(sorted(TIPOS))})")
                continue
            if tipo == "trayectoria":
                if it.get("estilo", "patinaje") not in ESTILOS:
                    errors.append(f"{where}: estilo {it.get('estilo')!r} no válido (válidos: {', '.join(sorted(ESTILOS))})")
                puntos = it.get("puntos")
                if not isinstance(puntos, list) or len(puntos) < 2:
                    errors.append(f"{where}: una trayectoria necesita al menos 2 puntos")
                    continue
                for p in puntos:
                    if not isinstance(p, list) or len(p) != 2:
                        errors.append(f"{where}: cada punto debe ser [x, y]")
                        break
                    check_point(p[0], p[1], where, errors, warnings, vista)
            else:
                check_point(it.get("x"), it.get("y"), where, errors, warnings, vista)
                if tipo == "jugador":
                    eq = it.get("equipo", "propio")
                    if eq not in EQUIPOS:
                        errors.append(f"{where}: equipo {eq!r} no válido (válidos: {', '.join(sorted(EQUIPOS))})")
                    if isinstance(it.get("x"), (int, float)) and isinstance(it.get("y"), (int, float)):
                        for (ox, oy, ok) in posiciones:
                            if ((it["x"] - ox) ** 2 + (it["y"] - oy) ** 2) ** 0.5 < 1.5:
                                warnings.append(f"{where}: jugador muy pegado al elemento {ok} (menos de 1,5 m); puede verse solapado")
                                break
                        posiciones.append((it["x"], it["y"], k))
    return errors, warnings


def load_and_validate(src):
    """Carga el JSON, lo normaliza a sesión, muestra avisos y sale si hay errores."""
    data = json.loads(pathlib.Path(src).read_text(encoding="utf-8"))
    if "ejercicios" not in data:
        data = {"ejercicios": [data]}
    errors, warnings = validate(data)
    for w in warnings:
        print("AVISO:", w)
    if errors:
        for e in errors:
            print("ERROR:", e)
        sys.exit(1)
    return data


def build_html(data):
    payload = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    html = TEMPLATE.read_text(encoding="utf-8")
    if PLACEHOLDER not in html:
        print("ERROR: la plantilla no contiene el marcador de datos")
        sys.exit(1)
    return html.replace(PLACEHOLDER, payload)


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    data = load_and_validate(sys.argv[1])
    dst = pathlib.Path(sys.argv[2])
    dst.write_text(build_html(data), encoding="utf-8")
    print(f"OK: {dst} ({len(data['ejercicios'])} ejercicio(s))")


if __name__ == "__main__":
    main()
