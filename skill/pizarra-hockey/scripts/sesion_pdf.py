#!/usr/bin/env python3
"""Genera el PDF de una sesión de entrenamiento (portada + una página por ejercicio con su diagrama).

Uso:
    python sesion_pdf.py sesion.json salida.pdf

Usa el mismo JSON que render.py, con campos de texto adicionales (ver SKILL.md).
Si no hay navegador disponible para generar el PDF, deja un HTML imprimible junto a la salida.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from render import build_html, load_and_validate  # noqa: E402

FOOTER = (
    '<div style="width:100%;font-size:8px;color:#8a92a3;padding:0 14mm;'
    'font-family:Helvetica,Arial,sans-serif;display:flex;justify-content:space-between">'
    '<span>{titulo}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>'
)


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    data = load_and_validate(sys.argv[1])
    data["__print"] = True
    dst = pathlib.Path(sys.argv[2])
    html_path = dst.with_suffix(".imprimible.html")
    html_path.write_text(build_html(data), encoding="utf-8")

    titulo = str(data.get("titulo", "Sesión")).replace("<", "&lt;").replace(">", "&gt;")
    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(html_path.resolve().as_uri())
            page.wait_for_load_state("networkidle")
            if errors:
                raise RuntimeError("error en la página: " + "; ".join(errors))
            page.pdf(
                path=str(dst),
                format="A4",
                print_background=True,
                prefer_css_page_size=True,
                display_header_footer=True,
                header_template="<span></span>",
                footer_template=FOOTER.format(titulo=titulo),
            )
            browser.close()
    except Exception as exc:  # sin playwright o sin navegador
        print(f"AVISO: no se pudo generar el PDF ({exc}).")
        print(f"HTML imprimible disponible en: {html_path} (abrir y usar Imprimir → Guardar como PDF)")
        sys.exit(3)

    html_path.unlink(missing_ok=True)
    print(f"OK: {dst} ({len(data['ejercicios'])} ejercicio(s))")


if __name__ == "__main__":
    main()
