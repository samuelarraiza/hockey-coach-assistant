/**
 * CONFIGURACIÓN – lo único que tienes que cambiar en el código.
 *
 * Las preguntas de bienestar y las pruebas físicas NO se cambian aquí:
 * se editan en las pestañas «Preguntas bienestar» y «Pruebas físicas» del libro.
 */
const EQUIPO = 'Mi equipo U13';


/* ======================================================================
 * Funciones comunes. No hace falta tocar nada a partir de aquí.
 * ====================================================================== */

function leerJugadores_(ss) {
  const hoja = ss.getSheetByName('Jugadores');
  if (!hoja) throw new Error('No encuentro la pestaña «Jugadores».');
  const filas = hoja.getRange(2, 1, Math.max(hoja.getLastRow() - 1, 1), 7).getValues();
  // Columnas: A Dorsal, B Nombre, C Año, D Posición, E Altura, F Peso, G Activo
  const nombres = filas
    .filter(f => String(f[1]).trim() !== '' && String(f[6]).trim() !== 'No')
    .map(f => String(f[1]).trim());
  if (!nombres.length) throw new Error('La pestaña «Jugadores» no tiene nombres. Rellénala antes de crear los formularios.');
  return nombres;
}

function leerTabla_(ss, nombreHoja) {
  const hoja = ss.getSheetByName(nombreHoja);
  if (!hoja) throw new Error('No encuentro la pestaña «' + nombreHoja + '».');
  const datos = hoja.getDataRange().getValues();
  const cab = datos[0].map(c => String(c).trim().toLowerCase());
  const filas = [];
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][0]).trim() === '') break;   // para en la primera fila vacía (debajo van las notas de ayuda)
    const o = { _fila: i + 1 };
    cab.forEach((c, j) => { o[c] = typeof datos[i][j] === 'string' ? datos[i][j].trim() : datos[i][j]; });
    filas.push(o);
  }
  return filas;
}

function opciones_(texto) {
  return String(texto || '').split('|').map(s => s.trim()).filter(Boolean);
}

function configurarFormulario_(form, descripcion, confirmacion, varias) {
  form.setDescription(descripcion);
  form.setConfirmationMessage(confirmacion);
  form.setAllowResponseEdits(varias);
  form.setShowLinkToRespondAgain(varias);
  form.setLimitOneResponsePerUser(false);
  try { form.setEmailCollectionType(FormApp.EmailCollectionType.DO_NOT_COLLECT); } catch (e) {
    try { form.setCollectEmail(false); } catch (e2) {}
  }
}

/** Vincula el formulario al libro y renombra su pestaña de respuestas. */
function vincular_(ss, form, nombrePestana) {
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  try { form.setPublished(true); } catch (e) {}
  form.setAcceptingResponses(true);
  SpreadsheetApp.flush();
  Utilities.sleep(3000);
  const id = form.getId();
  const nueva = ss.getSheets().find(h => { const u = h.getFormUrl(); return u && u.indexOf(id) !== -1; });
  if (!nueva) return;
  const vieja = ss.getSheetByName(nombrePestana);
  if (vieja && vieja.getSheetId() !== nueva.getSheetId()) {
    if (vieja.getLastRow() <= 1) ss.deleteSheet(vieja);
    else vieja.setName(nombrePestana + ' (antiguo)');
  }
  nueva.setName(nombrePestana);
}

/** Guarda los enlaces del formulario en las propiedades y en «Cómo usar». */
function guardarEnlaces_(ss, form, clave, fila, etiqueta) {
  let corto = form.getPublishedUrl();
  try { corto = form.shortenFormUrl(corto); } catch (e) {}
  const props = PropertiesService.getDocumentProperties();
  props.setProperty(clave + '_ID', form.getId());
  props.setProperty(clave + '_URL', corto);
  const h = ss.getSheetByName('Cómo usar');
  if (h) {
    h.getRange(fila, 1).setValue(etiqueta).setFontWeight('bold');
    h.getRange(fila, 2).setValue(corto);
    h.getRange(fila + 1, 1).setValue('Editar ' + etiqueta.toLowerCase()).setFontWeight('bold');
    h.getRange(fila + 1, 2).setValue(form.getEditUrl());
  }
  Logger.log(etiqueta + ': ' + corto);
  return corto;
}

/** Vuelve a cargar la lista de jugadores en los dos formularios. */
function actualizarJugadores() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const nombres = leerJugadores_(ss);
  const props = PropertiesService.getDocumentProperties();
  ['BIENESTAR_ID', 'FISICO_ID'].forEach(k => {
    const id = props.getProperty(k);
    if (!id) return;
    const item = FormApp.openById(id).getItems(FormApp.ItemType.LIST)[0];
    if (item) item.asListItem().setChoiceValues(nombres);
  });
  Logger.log('Lista de jugadores actualizada en los formularios.');
}

/** Si se pierden los enlaces de «Cómo usar», los vuelve a escribir. */
function repararEnlaces() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  [['Bienestar', 'BIENESTAR', 13, 'Formulario bienestar'], ['Físico', 'FISICO', 15, 'Formulario físico']].forEach(([pestana, clave, fila, etiqueta]) => {
    const h = ss.getSheetByName(pestana);
    const url = h && h.getFormUrl();
    if (url) guardarEnlaces_(ss, FormApp.openByUrl(url), clave, fila, etiqueta);
  });
}
