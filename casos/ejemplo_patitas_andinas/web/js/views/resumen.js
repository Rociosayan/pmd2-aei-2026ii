import { fmt, kpi, tabla, chip, cls, esc } from '../ui.js';

export function render(root, { pkg }) {
  const R = pkg.recomendacion, O = pkg.optimizacion, ev = O.optimo.ev, pol = O.politica_actual.ev, ch = pkg.churn;
  const prauc = ch.final_prueba.find((r) => r.modelo === ch.elegido)?.PR_AUC;
  const base = ch.tasa_base.test;
  const elegibles = pkg.cartera.length;
  root.innerHTML = `
  <h2>Decisión de noviembre 2026</h2>
  <p class="lead">Caso ejemplo del Proyecto Integrador 2: una tienda en línea de alimento y accesorios para mascotas (Lima, Trujillo y Piura) debe decidir a qué compradores recurrentes contactar, cuánto reponer de cada familia y qué presupuesto comprometer, dentro de sus límites de presupuesto, almacenamiento y despacho. Datos sintéticos con fines educativos; fecha de decisión ${esc(pkg.meta.fecha_datos)}.</p>
  <div class="grid g4">
    ${kpi('Compradores con consentimiento', fmt.n(elegibles), `elegibles al ${esc(pkg.meta.fecha_datos)}`)}
    ${kpi('PR-AUC del modelo (prueba)', fmt.n(prauc, 2), `tasa base ${fmt.p(base)} · ${esc(ch.elegido)}`)}
    ${kpi('Contactos recomendados', fmt.n(ev.contactos_wa + ev.contactos_llamada), `${ev.contactos_wa} WhatsApp · ${ev.contactos_llamada} llamadas · coste ${fmt.s(ev.coste_campana)}`)}
    ${kpi('Margen de operación (4 sem.)', fmt.s(ev.margen_operacion_4sem), `<span class="${cls(ev.margen_operacion_4sem - pol.margen_operacion_4sem)}">${fmt.sg(ev.margen_operacion_4sem - pol.margen_operacion_4sem)} vs política actual</span>`)}
  </div>
  <div class="grid g2" style="margin-top:14px">
    <div class="card"><h3>Recomendación</h3>
      <p><b>Qué hacer.</b> ${esc(R.decision)}</p>
      <p><b>Beneficio esperado.</b> ${esc(R.beneficio)}</p>
      <p><b>Sensibilidad.</b> ${esc(R.sensibilidad)}</p>
      <div class="note">${esc(R.detener_si)}</div>
    </div>
    <div class="card"><h3>Riesgos y límites</h3><ul>${R.riesgos.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
      <div class="note info">Un modelo de riesgo no estima el efecto causal de contactar. Los efectos de 0 %, 8 % y 15 % son <b>supuestos del enunciado</b>, no resultados del modelo.</div>
    </div>
  </div>
  <h3>Hoja de ruta</h3>
  <div class="card">${tabla([{ t: 'Etapa', k: 'etapa' }, { t: 'Acción', k: 'accion' }, { t: 'Responsable', k: 'responsable' }], R.hoja_ruta)}</div>
  <h3>Cómo se conecta con las semanas y con la rúbrica</h3>
  <div class="card">${tabla([{ t: 'Semana', k: 'sem' }, { t: 'Pestaña', k: 'tab' }, { t: 'Qué demuestra', k: 'que' }, { t: 'Capacidad de la rúbrica (Colab y producto)', k: 'rub' }], [
    { sem: '9', tab: 'Riesgo y valor', que: 'RFM, CLV, churn con etiqueta y horizonte explícitos, umbral económico, contactos y valor', rub: '1. Predice riesgo y demanda (5)' },
    { sem: '10', tab: 'Demanda', que: 'Pronóstico con base ingenua, backtesting temporal y traducción a unidades y soles', rub: '1. Predice riesgo y demanda (5)' },
    { sem: '11', tab: 'Optimización', que: 'Modelo entero mixto, factibilidad, política actual, sensibilidad y precios sombra', rub: '2. Optimiza y controla (5)' },
    { sem: '12', tab: 'Procesos', que: 'Anomalías, carta X̄ con línea base, reglas y protocolo de alertas', rub: '2. Optimiza y controla (5)' },
    { sem: '13', tab: 'Gobierno', que: 'Contrato, linaje, roles, auditoría por subgrupos, SHAP y matriz normativa', rub: '3. Audita y gobierna (3)' },
    { sem: '14', tab: 'Asistente', que: 'Text-to-SQL de solo lectura, 20 preguntas fijas, acierto y afirmaciones no sustentadas', rub: '4. Asistente (3)' },
    { sem: '15–16', tab: 'Calidad', que: 'Conciliación con el Colab, supuestos, versión de datos y lista de verificación', rub: '5. Colab reproducible y producto (4)' },
  ])}</div>
  <h3>Checkpoint de la Semana 14 (autoevaluación)</h3>
  <div class="card">${tabla([{ t: 'Criterio', k: 'criterio' }, { t: 'Evidencia', k: 'evidencia' }, { t: 'Defecto o pendiente', k: 'defecto' }, { t: 'Plan', k: 'plan' }, { t: 'Puntaje', k: 'puntaje_autoeval', n: true, f: (v) => fmt.n(v, 2) }], pkg.checkpoint)}
    <p style="margin:8px 0 0"><b>Total de autoevaluación: ${fmt.n(pkg.checkpoint.reduce((a, c) => a + c.puntaje_autoeval, 0), 2)} / 4</b> <span class="chip gris">referencial: la califica la docente</span></p></div>`;
}
