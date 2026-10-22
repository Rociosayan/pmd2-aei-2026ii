import { fmt, tabla, chip, esc, ok } from '../ui.js';
import * as opt from '../optimizer.js';
import { cartaXbar, evaluarUmbral } from '../control.js';
import { crearAsistente } from '../assistant.js';

export function render(root, { pkg, P, getHighs, getDb }) {
  root.innerHTML = `
  <h2>Calidad, supuestos y reproducibilidad <span class="chip">Semanas 15–16</span></h2>
  <p class="lead">Versión de los datos <code>${esc(pkg.meta.version_datos)}</code> · semilla ${pkg.meta.semilla} · fecha de actualización ${esc(pkg.meta.fecha_datos)}. Las cifras de esta página deben coincidir con el Colab para la misma entrada: el botón recalcula en su navegador el solver, la carta de control, el umbral y el asistente y los compara con lo que el Colab guardó.</p>
  <div class="card"><div class="ctl"><button class="btn" id="c-run">Conciliar la app con el Colab</button></div><div id="c-out"></div></div>
  <h3>Controles de recepción (SQL en el Colab)</h3>
  <div class="card">${tabla([{ t: 'Control', k: 'control' }, { t: 'Violaciones', k: 'violaciones', n: true }, { t: 'Estado', k: 'estado', f: (v) => chip(v, v === 'OK' ? 'ok' : 'bad') }], pkg.calidad)}</div>
  <h3>Supuestos del enunciado (tabla recursos)</h3>
  <div class="card"><p class="lead" style="font-size:13px">Presupuestos, capacidades y efectos son <b>supuestos del enunciado</b>, editables en la sensibilidad; no son datos observados.</p>
    ${tabla([{ t: 'Recurso', k: 'recurso' }, { t: 'Línea', k: 'linea' }, { t: 'Disponibilidad', k: 'disponibilidad', n: true, f: (v) => fmt.n(v, 2) }, { t: 'Consumo', k: 'consumo_unitario', n: true, f: (v) => fmt.n(v, 3) }, { t: 'Coste', k: 'coste', n: true, f: (v) => fmt.n(v, 2) }, { t: 'Margen', k: 'margen', n: true, f: (v) => fmt.n(v, 2) }, { t: 'Límite', k: 'limite', n: true, f: (v) => fmt.n(v, 2) }, { t: 'Unidad', k: 'unidad' }, { t: 'Nota', k: 'nota' }], pkg.supuestos)}</div>
  <div class="grid g2" style="margin-top:14px">
    <div class="card"><h3>Política actual (reconstruida en el Colab)</h3>${tabla([{ t: 'Regla', k: 'regla_id' }, { t: 'Alcance', k: 'alcance' }, { t: 'Descripción', k: 'descripcion' }], pkg.politica)}</div>
    <div class="card"><h3>Documentos versionados</h3>${tabla([{ t: 'Documento', k: (r) => `${r.doc_id} v${r.version}` }, { t: 'Título', k: 'titulo' }, { t: 'Estado', k: 'estado', f: (v) => chip(v, v === 'vigente' ? 'ok' : 'gris') }], pkg.documentos)}</div>
  </div>
  <h3>Lista de verificación de entrega</h3>
  <div class="card"><ul>${['Colab ejecutable de principio a fin desde un entorno limpio (semilla, dependencias fijadas, datos desde GitHub sin rutas privadas)', 'Partición temporal con clientes disjuntos; umbral en validación; prueba informada una vez',
    'Optimización con estado del solver y restricciones comprobadas; política actual bajo las mismas hipótesis; sensibilidad con efecto 0', 'Carta de control con línea base, reglas, protocolo y responsables; anomalías como señales, no fraude',
    'Auditoría por subgrupos con denominadores; SHAP interpretado; matriz normativa con fuentes y pendientes', 'Asistente con 20 preguntas fijas ejecutadas; el LLM no ejecutado se declara como tal',
    'Producto desplegado con filtros, escenarios, fecha de actualización, unidades y supuestos visibles; cifras iguales al Colab', 'Sin claves, datos personales ni secretos en el repositorio; cada integrante puede explicar cualquier bloque'].map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
  const $r = (s) => root.querySelector(s);
  $r('#c-run').onclick = async () => {
    const out = $r('#c-out'); out.innerHTML = '<div class="loading">Recalculando…</div>';
    const filas = [];
    const add = (n, app, col, tol, unit = '') => filas.push({ n, app, col, ok: Math.abs(app - col) <= tol, unit });
    try {
      const highs = await getHighs();
      const sol = opt.resolver(highs, pkg, P), e = opt.evaluar(pkg, P, sol), nb = pkg.optimizacion.optimo.ev;
      filas.push({ n: 'Estado del solver', app: sol.estado, col: pkg.optimizacion.optimo.estado, ok: sol.estado === pkg.optimizacion.optimo.estado });
      add('Margen de operación óptimo (S/)', e.margen_operacion_4sem, nb.margen_operacion_4sem, 0.5); add('Valor de retención óptimo (S/)', e.valor_retencion_6m, nb.valor_retencion_6m, 0.5);
      add('Contactos', e.contactos_wa + e.contactos_llamada, nb.contactos_wa + nb.contactos_llamada, 0);
      const ep = opt.evaluar(pkg, P, opt.politicaActual(pkg, P)); add('Margen de operación política actual (S/)', ep.margen_operacion_4sem, pkg.optimizacion.politica_actual.ev.margen_operacion_4sem, 0.5);
      const c = pkg.control;
      ['Lima', 'Trujillo', 'Piura'].forEach((s) => { const r = cartaXbar(c.semanal, s, c.base_ini, c.base_fin); add(`μ₀ carta ${s} (min)`, r.mu0, c.parametros[s].mu0, 1e-3); add(`σ₀ carta ${s} (min)`, r.sigma0, c.parametros[s].sigma0, 1e-3); });
      const u = evaluarUmbral(pkg.churn.pred_prueba, pkg.churn.umbral, P.efecto_base, P);
      add('Verdaderos positivos en prueba', u.tp, pkg.churn.matriz.tp, 0); add('Falsos positivos en prueba', u.fp, pkg.churn.matriz.fp, 0);
      const db = await getDb();
      const docs = db.exec('select doc_id, version, estado, texto from documentos')[0].values.map((v) => ({ doc_id: v[0], version: v[1], estado: v[2], texto: v[3] }));
      const a = crearAsistente(db, { familias: pkg.meta.familias, sedes: pkg.meta.sedes, last4: pkg.asistente.last4, documentos: docs });
      const ac = pkg.asistente.preguntas.filter((q) => a.evaluar(q.esperado, a.responder(q.pregunta)).ok).length;
      add('Aciertos del asistente (de 20)', ac, pkg.asistente.resumen.aciertos, 0);
    } catch (err) { out.innerHTML = `<div class="note bad">Error en la conciliación: ${esc(err.message)}</div>`; return; }
    const todo = filas.every((f) => f.ok);
    out.innerHTML = `<div class="note ${todo ? 'ok' : 'bad'}">${todo ? 'La app reproduce las cifras del Colab.' : 'Hay diferencias entre la app y el Colab.'}</div>` +
      tabla([{ t: 'Cifra', k: 'n' }, { t: 'App (navegador)', k: 'app', n: true, f: (v) => (typeof v === 'number' ? fmt.n(v, 3) : esc(v)) }, { t: 'Colab', k: 'col', n: true, f: (v) => (typeof v === 'number' ? fmt.n(v, 3) : esc(v)) }, { t: 'Resultado', k: 'ok', f: (v) => ok(v).replace('cumple', 'concilia').replace('NO concilia', 'DIFIERE') }], filas);
  };
}
