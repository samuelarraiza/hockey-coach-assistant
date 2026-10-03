/**
 * Formulario de pruebas físicas (lo rellena el preparador físico, sin acceso al libro).
 *
 * 1. Revisa o cambia las pruebas en la pestaña «Pruebas físicas».
 * 2. Ejecuta «crearFormularioFisico». El enlace queda en «Cómo usar» (B15).
 *
 * El protocolo de cada prueba («Cómo se hace» e «Intentos») aparece debajo de su pregunta,
 * para que se mida igual cada mes.
 */

const PATRONES_ = {
  segundos: '^\\d{1,3}([.,]\\d{1,2})?$',
  'centímetros': '^\\d{1,4}([.,]\\d)?$',
  repeticiones: '^\\d{1,4}$',
  otro: '^\\d+([.,]\\d+)?$'
};
const EJEMPLOS_ = { segundos: '2,15', 'centímetros': '182', repeticiones: '25', otro: '12,5' };

function crearFormularioFisico() {
  if (PropertiesService.getDocumentProperties().getProperty('FISICO_ID')) {
    throw new Error('El formulario físico ya existe. Para cambiar pruebas, edítalo con el enlace de «Cómo usar» (B16).');
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pruebas = leerTabla_(ss, 'Pruebas físicas').filter(p => p['prueba']);
  if (!pruebas.length) throw new Error('La pestaña «Pruebas físicas» está vacía.');
  const jugadores = leerJugadores_(ss);

  const form = FormApp.create('Pruebas físicas – ' + EQUIPO);
  configurarFormulario_(form,
    'Una respuesta por jugador y día de pruebas. Deja en blanco las pruebas que no haya hecho. Mismo orden, calentamiento y horario cada mes.',
    'Guardado. Pulsa «Enviar otra respuesta» para el siguiente jugador.', true);

  form.addDateItem().setTitle('Fecha de las pruebas').setRequired(true);
  form.addListItem().setTitle('Jugador').setChoiceValues(jugadores).setRequired(true);

  pruebas.forEach(p => {
    const unidad = String(p['unidad'] || 'otro').toLowerCase();
    const clave = PATRONES_[unidad] ? unidad : 'otro';
    const ayuda = [p['cómo se hace'], p['intentos'] ? p['intentos'] + ' intento(s): apunta el mejor.' : '']
      .filter(Boolean).join(' ');
    const validacion = FormApp.createTextValidation()
      .setHelpText('Solo el número, por ejemplo ' + EJEMPLOS_[clave] + '.')
      .requireTextMatchesPattern(PATRONES_[clave])
      .build();
    form.addTextItem().setTitle(String(p['prueba'])).setHelpText(ayuda).setValidation(validacion).setRequired(false);
  });

  form.addMultipleChoiceItem().setTitle('¿Ha hecho todas las pruebas?')
    .setChoiceValues(['Sí', 'Parcial', 'No']).setRequired(true);
  form.addParagraphTextItem().setTitle('Observaciones')
    .setHelpText('Molestias, condiciones del hielo, etc. Opcional.').setRequired(false);

  vincular_(ss, form, 'Físico');
  guardarEnlaces_(ss, form, 'FISICO', 15, 'Formulario físico');
}
