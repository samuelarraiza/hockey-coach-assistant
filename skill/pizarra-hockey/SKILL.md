---
name: pizarra-hockey
description: Dibuja ejercicios, sistemas y tácticas de hockey hielo en una pizarra interactiva (pista IIHF) donde el entrenador puede mover jugadores, dibujar líneas y descargar la imagen. Úsala SIEMPRE que se programe un entrenamiento, se proponga o explique un ejercicio, un juego reducido, una salida de zona, un forecheck, una colocación en saques o cualquier táctica de hockey, aunque el usuario no pida explícitamente un dibujo o una pizarra. Úsala también para generar el PDF de la sesión (portada, resumen y una página por ejercicio con su diagrama) cuando el entrenador confirme o apruebe una sesión, o pida el documento, la ficha o el PDF del entrenamiento.
---

# Pizarra de hockey

Genera un archivo HTML con una o varias pizarras interactivas. Tú describes cada ejercicio en JSON, el script lo dibuja, y el entrenador puede después mover jugadores, añadir elementos, dibujar líneas, descargar un PNG o copiar el JSON editado.

## Flujo

1. Escribe un JSON con la sesión (o un único ejercicio) siguiendo el formato de abajo. Guárdalo, por ejemplo, en `/home/claude/sesion.json`.
2. Ejecuta el script:
   ```bash
   python <ruta-de-esta-skill>/scripts/render.py /home/claude/sesion.json /mnt/user-data/outputs/<nombre>.html
   ```
3. Si el script muestra `ERROR`, corrige el JSON y repite. Si muestra `AVISO` (por ejemplo, jugadores solapados), revisa esas coordenadas.
4. Presenta el HTML al usuario con la herramienta de presentar archivos.
5. Para una sesión completa, mete todos los ejercicios en un único HTML (lista `ejercicios`), no un archivo por ejercicio.

El texto completo de la sesión (objetivos, desarrollo, tiempos) va en tu respuesta como siempre. La pizarra es el complemento visual: en cada ejercicio basta con una `descripcion` breve y los `puntos_clave`.

Si el usuario te pega un JSON copiado desde la pizarra ("Ver JSON"), es su versión editada del ejercicio: úsala como base a partir de ese momento.

## Sistema de coordenadas

Las unidades son metros. La pista mide 60 × 30 m.

- **x**: a lo largo de la pista. Va de **-30** (valla izquierda) a **+30** (valla derecha). x = 0 es la línea roja central.
- **y**: a lo ancho. Va de **-15** (valla **de arriba** en la pantalla) a **+15** (valla **de abajo**).

Referencias fijas:

| Marca | Coordenadas |
|---|---|
| Líneas de gol | x = ±26 |
| Porterías (boca en la línea de gol) | (±26, 0) |
| Líneas azules | x = ±7,14 |
| Círculos de saque de zona (radio 4,5) | (±20, ±7) |
| Puntos de saque de zona neutral | (±5,64, ±7) |
| Círculo central (radio 4,5) | (0, 0) |
| Slot (zona derecha) | aprox. x 19–24, y -3 a 3 |
| Esquinas (radio 8,5) | las vallas se curvan a partir de \|x\| > 21,5 y \|y\| > 6,5 |

**Convención:** el equipo propio ataca hacia la **derecha** (+x). Su zona defensiva es la izquierda (x < -7,14) y la de ataque la derecha (x > 7,14).

**Vista:**
- `"vista": "entera"` muestra toda la pista.
- `"vista": "media"` muestra solo x de 0 a 30: zona neutral derecha y zona de ataque. Para ejercicios de media pista usa siempre esa mitad, aunque en la realidad se hagan en la otra.

Antes de colocar un elemento cerca de las esquinas, comprueba que queda dentro de la curva: con \|x\| > 21,5, la y máxima es 6,5 + √(8,5² − (\|x\| − 21,5)²).

## Formato del JSON

```json
{
  "titulo": "Sesión 1 – Salida de zona",
  "ejercicios": [
    {
      "titulo": "Nombre del ejercicio",
      "vista": "entera",
      "duracion": "10 min",
      "descripcion": "Resumen breve del desarrollo.",
      "puntos_clave": ["Corrección 1", "Corrección 2"],
      "elementos": [ ... ]
    }
  ]
}
```

### Elementos

| tipo | Campos | Notas |
|---|---|---|
| `jugador` | `x`, `y`, `equipo`, `etiqueta` | `equipo`: `propio` (azul), `rival` (rojo), `portero` (verde, «G» por defecto), `entrenador` (triángulo negro, «E»). Etiqueta corta: `C`, `A1`, `A2`, `D1`, `D2`, números... |
| `disco` | `x`, `y`, `cantidad` | `cantidad` > 1 dibuja un montón de discos (máximo 6). |
| `cono` | `x`, `y` | |
| `porteria` | `x`, `y`, `angulo` | Portería adicional (las dos reglamentarias ya están dibujadas). `angulo` es la dirección hacia la que mira la boca: 0 = derecha, 90 = abajo, 180 = izquierda, 270 = arriba. |
| `texto` | `x`, `y`, `texto`, `tam` | `tam` en metros (por defecto 1). Úsalo para notas como «x4» junto a una fila o «Zona 1». |
| `trayectoria` | `estilo`, `puntos`, `etiqueta`, `color` | `puntos`: lista de [x, y], mínimo 2. Con 3 o más puntos la línea se curva suavemente pasando por todos ellos. `etiqueta`: número de orden de la acción. |

### Estilos de trayectoria (notación estándar)

| estilo | Dibujo | Significado |
|---|---|---|
| `patinaje` | Línea continua con flecha | Patinar sin disco |
| `pase` | Línea discontinua con flecha | Pase |
| `tiro` | Doble línea con flecha grande | Tiro |
| `conduccion` | Línea ondulada con flecha | Conducir el disco |
| `atras` | Línea con rayitas transversales | Patinaje hacia atrás |
| `parada` | Línea terminada en barra perpendicular | Patinar y frenar en seco |

## Cómo dibujar bien

- **Numera las acciones** en orden con `etiqueta` ("1", "2", "3"...). Las acciones simultáneas llevan el mismo número.
- **Las trayectorias empiezan a ~1 m del jugador** que las ejecuta, no en su centro. Los pases terminan a ~1 m del receptor. Así no se tapan los jugadores.
- **No pongas jugadores encima de las trayectorias** de otros ni a menos de 1,5 m entre sí.
- **Curvas con 3–4 puntos**: un arco, un giro alrededor de un cono o un desmarque. No hacen falta más.
- **Filas de jugadores**: dibuja 1–2 jugadores y añade un `texto` como «x4» al lado, en lugar de dibujar a todos.
- **Tácticas y sistemas** (forecheck, defensa en zona, saques): coloca a los jugadores en sus posiciones, usa trayectorias solo para los desplazamientos clave y añade `texto` para zonas o reglas («Slot», «Zona 1»).
- **Rivales** solo cuando aporten (presión, oposición). En ejercicios sin oposición no los pongas.
- **Varias fases**: si una táctica tiene varias fases (por ejemplo, la rotación cuando el disco cambia de lado), crea un ejercicio por fase en el mismo HTML, con títulos «Fase 1», «Fase 2».

## Ejemplo

`assets/ejemplo.json` contiene dos ejercicios completos: una vuelta con pase y tiro en pista entera y un 2c1 a portería en media pista. Léelo si tienes dudas sobre el formato o las proporciones.

## Documento PDF de la sesión

Cuando el entrenador **confirme** una sesión ("me gusta", "confirmo", "dame el documento", "pásamelo en PDF"), genera el PDF:

1. Parte del mismo JSON de la sesión. Si el entrenador te ha pegado JSON editados desde la pizarra ("Ver JSON"), sustituye con ellos los `elementos` de esos ejercicios.
2. Completa los campos de texto (abajo). El PDF debe ser autosuficiente: el entrenador lo usará en la pista sin el chat.
3. Ejecuta:
   ```bash
   python <ruta-de-esta-skill>/scripts/sesion_pdf.py /home/claude/sesion.json /mnt/user-data/outputs/<nombre-sesion>.pdf
   ```
4. Presenta el PDF. Si el script sale con código 3 (no hay navegador para generar PDF), presenta el `.imprimible.html` que deja junto a la salida y explica que se puede guardar como PDF desde Imprimir.

**Campos de la sesión** (todos opcionales salvo `titulo` y `ejercicios`):
`titulo`, `equipo`, `fecha`, `jugadores`, `porteros`, `duracion_total`, `objetivo`, `notas`.

**Campos de cada ejercicio** (además de `titulo`, `vista`, `duracion` y `elementos`):

| Campo | Contenido |
|---|---|
| `origen` | `Documento`, `Adaptado` o `Nuevo` |
| `fuente` | Documento y página o sección. Si es nuevo: «Propuesta del asistente». Si es adaptado: qué se ha cambiado. |
| `objetivo` | 1–2 frases |
| `organizacion` | Jugadores, porteros, material, colocación |
| `desarrollo` | Lista de pasos (se numeran solos) o texto |
| `puntos_clave` | Lista de 2–4 correcciones |
| `variante` | Progresión o variante |
| `espacio` | Opcional; por defecto se deduce de `vista` |

`duracion` debe empezar por el número de minutos ("10 min"): el resumen de la portada calcula los tramos de tiempo a partir de él. Un ejercicio sin `elementos` (por ejemplo, cardio) sale sin diagrama.

## Lo que puede hacer el entrenador en la pizarra

Explícaselo en una línea la primera vez que la uses en una conversación:

- Arrastrar jugadores, discos, conos y líneas. Al seleccionar una línea aparecen sus puntos y se pueden mover uno a uno.
- Añadir elementos con los botones «+».
- Dibujar líneas: elegir el estilo, pulsar «Dibujar línea», hacer clic en varios puntos y terminar con doble clic.
- Cambiar etiquetas, borrar, girar porterías y volver al dibujo original con «Restaurar».
- «Descargar PNG» para guardar la imagen y «Ver JSON» para copiar su versión y pegártela.
