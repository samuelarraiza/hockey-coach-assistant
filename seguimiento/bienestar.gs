/**
 * Formulario de bienestar mensual (lo rellenan los jugadores desde el móvil).
 *
 * 1. Rellena la pestaña «Jugadores».
 * 2. Revisa o cambia las preguntas en la pestaña «Preguntas bienestar».
 * 3. Ejecuta «crearFormularioBienestar». El enlace queda en «Cómo usar» (B13).
 *
 * Otras funciones:
 * - activarRecordatorioMensual: te envía un correo el día 1 de cada mes con el enlace y un mensaje para el grupo.
 */

function crearFormularioBienestar() {
  if (PropertiesService.getDocumentProperties().getProperty('BIENESTAR_ID')) {
    throw new Error('El formulario de bienestar ya existe. Para cambiar preguntas, edítalo con el enlace de «Cómo usar» (B14).');
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const preguntas = leerTabla_(ss, 'Preguntas bienestar').filter(p => p['pregunta']);
  if (!preguntas.length) throw new Error('La pestaña «Preguntas bienestar» está vacía.');
  const jugadores = leerJugadores_(ss);

  const form = FormApp.create('Bienestar mensual – ' + EQUIPO);
  configurarFormulario_(form,
    'Contesta con sinceridad: no hay respuestas buenas ni malas. Solo las lee el cuerpo técnico. Son 2 minutos.',
    '¡Gracias! Nos vemos en el hielo.', false);

  form.addListItem().setTitle('¿Quién eres?').setChoiceValues(jugadores).setRequired(true);
  preguntas.forEach(p => anadirPregunta_(form, p));

  vincular_(ss, form, 'Bienestar');
  guardarEnlaces_(ss, form, 'BIENESTAR', 13, 'Formulario bienestar');
}

function anadirPregunta_(form, p) {
  const titulo = String(p['pregunta']);
  const tipo = String(p['tipo'] || '').toLowerCase();
  const ops = opciones_(p['opciones']);
  const obligatoria = String(p['obligatoria'] || 'Sí').toLowerCase().startsWith('s');
  const fila = ' (fila ' + p._fila + ' de «Preguntas bienestar»)';

  if (tipo.startsWith('escala')) {
    const m = tipo.match(/(\d+)\s*[-–a]\s*(\d+)/);
    const min = m ? Number(m[1]) : 1, max = m ? Number(m[2]) : 5;
    form.addScaleItem().setTitle(titulo).setBounds(min, max)
      .setLabels(ops[0] || '', ops[1] || '').setRequired(obligatoria);
  } else if (tipo.startsWith('opci')) {
    if (ops.length < 2) throw new Error('Una pregunta de opción múltiple necesita al menos 2 opciones separadas por |' + fila);
    form.addMultipleChoiceItem().setTitle(titulo).setChoiceValues(ops).setRequired(obligatoria);
  } else if (tipo.startsWith('casillas')) {
    if (ops.length < 2) throw new Error('Una pregunta de casillas necesita al menos 2 opciones separadas por |' + fila);
    form.addCheckboxItem().setTitle(titulo).setChoiceValues(ops).setRequired(obligatoria);
  } else if (tipo.startsWith('respuesta corta')) {
    form.addTextItem().setTitle(titulo).setRequired(obligatoria);
  } else if (tipo.startsWith('p')) {
    form.addParagraphTextItem().setTitle(titulo).setRequired(obligatoria);
  } else {
    throw new Error('Tipo de pregunta desconocido: «' + p['tipo'] + '»' + fila);
  }
}

function activarRecordatorioMensual() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'enviarRecordatorio_')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('enviarRecordatorio_').timeBased().onMonthDay(1).atHour(18).create();
  Logger.log('Recordatorio activado: día 1 de cada mes, sobre las 18:00.');
}

function enviarRecordatorio_() {
  const url = PropertiesService.getDocumentProperties().getProperty('BIENESTAR_URL');
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(),
    'Formulario de bienestar – toca enviarlo',
    'Toca mandar el formulario de bienestar al grupo:\n' + url +
    '\n\nMensaje para copiar y pegar:\n\n¡Hola equipo! Toca el formulario del mes. Son 2 minutos. Tenéis hasta el domingo 👉 ' + url);
}
