import { fmt, tabla, chip, esc } from '../ui.js';
import { crearAsistente } from '../assistant.js';

export function render(root, { pkg, getDb }) {
  const A = pkg.asistente;
  const ej = A.preguntas.map((q) => q.pregunta);
  root.innerHTML = `
  <h2>Asistente analítico (text-to-SQL) <span class="chip">Semana 14</span></h2>
  <p class="lead">Responde preguntas de gerencia con <b>consultas SQL de solo lectura</b> sobre las tablas del caso y los documentos <b>vigentes</b>. Es la <b>línea base determinista</b> (reglas y plantillas, sin modelo de lenguaje). El motor con LLM <b>no fue ejecutado</b> (sin clave de API): queda pendiente y no se presentan resultados que no se corrieron.</p>
  <div class="note info">Controles: una sola sentencia <code>SELECT</code>, lista blanca de tablas, sin datos individuales de clientes, máximo 200 filas, rechazo de peticiones destructivas, de datos personales y de instrucciones adversarias, abstención sin evidencia y aclaración ante ambigüedad. Al preguntar se carga en su navegador una base SQLite (≈ 8 MB, solo lectura).</div>
  <div class="card">
    <textarea id="a-q" placeholder="Escriba una pregunta…">¿Cuántos clientes hay por sede?</textarea>
    <div class="q" id="a-ej">${ej.map((e) => `<button>${esc(e)}</button>`).join('')}</div>
    <div class="ctl"><button class="btn" id="a-go">Preguntar</button><span id="a-st" class="chip gris">base SQLite sin cargar</span></div>
    <div id="a-out"></div>
  </div>
  <h3>Evaluación fija de 20 preguntas</h3>
  <div class="card">
    <div class="ctl"><button class="btn" id="a-eval">Ejecutar las 20 preguntas ahora en este navegador</button><span class="chip gris">Colab: ${A.resumen.aciertos}/${A.resumen.preguntas} aciertos · ${A.resumen.afirmaciones_no_sustentadas} afirmaciones no sustentadas</span><span class="chip warn">LLM: ${esc(A.llm)}</span></div>
    <div id="a-ev"></div>
    <div class="note">100 % en preguntas que tienen plantilla no mide inteligencia: es el estándar para medir a un LLM. Ante <b>paráfrasis</b> (otras palabras) la línea base acierta solo ${esc(A.cobertura_parafrasis)}; ahí un LLM aportaría cobertura, a cambio de medir sus riesgos (SQL incorrecto, cifras inventadas, obediencia a instrucciones adversarias) con estas mismas preguntas.</div>
    <h4>Resultados guardados del Colab (incluye paráfrasis)</h4>
    ${tabla([{ t: 'ID', k: 'id_pregunta' }, { t: 'Tipo', k: 'tipo' }, { t: 'Motor', k: 'motor' }, { t: 'Pregunta', k: 'pregunta' }, { t: 'Acierto', k: 'acierto', f: (v) => (v == null ? chip('pendiente', 'warn') : v ? chip('sí', 'ok') : chip('no', 'bad')) }, { t: 'No sustentadas', k: 'afirmaciones_no_sustentadas', n: true }, { t: 'Latencia (s)', k: 'latencia_s', n: true, f: (v) => (v == null ? '—' : fmt.n(v, 3)) }].filter(Boolean), A.evaluacion.filter((r) => r.motor === 'determinista'))}
  </div>`;
  const $r = (s) => root.querySelector(s);
  let asis = null;
  async function listo() {
    if (asis) return asis;
    $r('#a-st').textContent = 'cargando base SQLite…'; $r('#a-st').className = 'chip warn';
    const db = await getDb();
    const docs = db.exec('select doc_id, version, estado, texto from documentos')[0].values.map((v) => ({ doc_id: v[0], version: v[1], estado: v[2], texto: v[3] }));
    asis = crearAsistente(db, { familias: pkg.meta.familias, sedes: pkg.meta.sedes, last4: A.last4, documentos: docs });
    $r('#a-st').textContent = 'base SQLite lista (solo lectura)'; $r('#a-st').className = 'chip ok';
    return asis;
  }
  const tipoChip = { responde: 'ok', rechaza: 'bad', abstiene: 'warn', aclara: 'warn' };
  async function preguntar() {
    const q = $r('#a-q').value.trim(); if (!q) return;
    let a; try { a = await listo(); } catch (e) { $r('#a-out').innerHTML = `<div class="note bad">No se pudo cargar la base: ${esc(e.message)}</div>`; return; }
    const r = a.responder(q);
    $r('#a-out').innerHTML = `<div style="margin-top:12px"><span class="chip ${tipoChip[r.estado] || ''}">${esc(r.estado)}</span> <span class="chip gris">${fmt.n(r.latencia_ms, 1)} ms</span>
      <p style="margin:8px 0"><b>${esc(r.texto).slice(0, 700)}</b></p>
      ${r.sql ? `<h4>SQL ejecutado (validado: solo lectura)</h4><pre>${esc(r.sql)}</pre>` : ''}
      ${r.resultado && r.resultado.rows.length && r.resultado.columns.length > 1 && !r.sql.includes('documentos') ? '<h4>Resultado</h4>' + tabla(r.resultado.columns.map((c, j) => ({ t: c, k: j })), r.resultado.rows.slice(0, 20)) : ''}</div>`;
  }
  $r('#a-go').onclick = preguntar;
  $r('#a-q').onkeydown = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) preguntar(); };
  $r('#a-ej').onclick = (e) => { if (e.target.tagName === 'BUTTON') { $r('#a-q').value = e.target.textContent; preguntar(); } };
  $r('#a-eval').onclick = async () => {
    const a = await listo(); let aciertos = 0;
    const filas = A.preguntas.map((q) => { const r = a.responder(q.pregunta); const e = a.evaluar(q.esperado, r); aciertos += e.ok ? 1 : 0;
      const col = A.evaluacion.find((x) => x.id_pregunta === q.id && x.motor === 'determinista');
      return { id: q.id, tipo: q.tipo, pregunta: q.pregunta, obs: r.estado, ok: e.ok, ns: e.noSust, lat: r.latencia_ms, igual: col && col.acierto === (e.ok ? 1 : 0) }; });
    $r('#a-ev').innerHTML = `<p><b>${aciertos}/20</b> aciertos · ${filas.reduce((a, f) => a + f.ns, 0)} afirmaciones no sustentadas · ${filas.every((f) => f.igual) ? chip('coincide con el Colab en las 20', 'ok') : chip('difiere del Colab', 'bad')}</p>` +
      tabla([{ t: 'ID', k: 'id' }, { t: 'Tipo', k: 'tipo' }, { t: 'Pregunta', k: 'pregunta' }, { t: 'Conducta observada', k: 'obs' }, { t: 'Acierto', k: 'ok', f: (v) => (v ? chip('sí', 'ok') : chip('no', 'bad')) }, { t: 'Latencia (ms)', k: 'lat', n: true, f: (v) => fmt.n(v, 1) }], filas);
  };
}
