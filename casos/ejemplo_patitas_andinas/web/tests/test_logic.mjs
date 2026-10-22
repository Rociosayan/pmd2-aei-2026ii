// Prueba de conciliación: la lógica de la página (HiGHS, carta X̄, umbral, SQL en SQLite) debe reproducir las cifras del cuaderno (PuLP/CBC, pandas, DuckDB).
// Ejecutar:  node tests/test_logic.mjs
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as opt from '../js/optimizer.js';
import * as ctl from '../js/control.js';
import { crearAsistente } from '../js/assistant.js';

const require = createRequire(import.meta.url);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const vend = (f) => path.join(aqui, '..', 'vendor', f);
const pkg = JSON.parse(fs.readFileSync(path.join(aqui, '..', 'data', 'paquete_app.json'), 'utf8'));
const cifras = JSON.parse(fs.readFileSync(path.join(aqui, '..', '..', 'salidas', 'cifras_clave.json'), 'utf8'));
let fallos = 0, pruebas = 0;
const casi = (a, b, tol, nombre) => { pruebas++; const ok = Math.abs(a - b) <= tol; if (!ok) fallos++; console.log(`${ok ? 'OK ' : 'FALLA'} ${nombre}: app=${a} cuaderno=${b}`); };
const igual = (a, b, nombre) => { pruebas++; const ok = a === b; if (!ok) fallos++; console.log(`${ok ? 'OK ' : 'FALLA'} ${nombre}: app=${a} cuaderno=${b}`); };

// ---- 1. Optimización (HiGHS vs PuLP/CBC)
const highs = await require(vend('highs.js'))({ locateFile: (f) => vend(f) });
const P = opt.parametrosPorDefecto(pkg);
const sol = opt.resolver(highs, pkg, P);
igual(sol.estado, 'Optimal', 'estado del solver');
const ev = opt.evaluar(pkg, P, sol);
const nb = pkg.optimizacion.optimo.ev;
casi(ev.margen_operacion_4sem, nb.margen_operacion_4sem, 0.5, 'margen de operación óptimo');
casi(ev.valor_retencion_6m, nb.valor_retencion_6m, 0.5, 'valor de retención óptimo');
casi(ev.contactos_wa + ev.contactos_llamada, nb.contactos_wa + nb.contactos_llamada, 0, 'contactos');
casi(ev.compra_S, nb.compra_S, 1, 'compra (S/)');
igual(ev.cumple_todo, true, 'la solución cumple todas las restricciones');
const pol = opt.politicaActual(pkg, P);
const evp = opt.evaluar(pkg, P, pol);
const np = pkg.optimizacion.politica_actual.ev;
casi(evp.margen_operacion_4sem, np.margen_operacion_4sem, 0.5, 'margen de operación política actual');
casi(evp.valor_retencion_6m, np.valor_retencion_6m, 0.5, 'valor de retención política actual');
// sensibilidad: todos los escenarios del cuaderno
const mapaEsc = { base: {}, 'demanda baja': { escenario_demanda: 'bajo' }, 'demanda alta': { escenario_demanda: 'alto' }, 'compra −20 %': { pres_compra: P.pres_compra * 0.8 },
  'almacén −15 %': { almacen: P.almacen * 0.85 }, 'campaña ×2': { pres_campana: P.pres_campana * 2 }, 'compra −25 % (prueba de infactibilidad)': { pres_compra: P.pres_compra * 0.75 } };
for (const fila of pkg.optimizacion.sensibilidad) {
  const Q = { ...P, efecto: fila.efecto, ...mapaEsc[fila.escenario] };
  const s = opt.resolver(highs, pkg, Q);
  if (fila.estado !== 'Optimal') { igual(s.estado === 'Optimal', false, `sensibilidad ${fila.escenario} (efecto ${fila.efecto}) infactible`); continue; }
  const e = opt.evaluar(pkg, Q, s);
  casi(e.margen_operacion_4sem, fila.margen_operacion_4sem, 1, `sensibilidad ${fila.escenario} (efecto ${fila.efecto}) margen`);
  casi(e.valor_retencion_6m, fila.valor_retencion_6m, 1, `sensibilidad ${fila.escenario} (efecto ${fila.efecto}) retención`);
}

// ---- 2. Carta de control
const c = pkg.control;
for (const sede of ['Lima', 'Trujillo', 'Piura']) {
  const r = ctl.cartaXbar(c.semanal, sede, c.base_ini, c.base_fin);
  casi(r.mu0, c.parametros[sede].mu0, 1e-3, `μ0 ${sede}`);
  casi(r.sigma0, c.parametros[sede].sigma0, 1e-3, `σ0 ${sede}`);
  const py = c.resultado.filter((x) => x.sede === sede);
  igual(r.filas.filter((f) => f.senal).length, py.filter((x) => x.senal).length, `señales ${sede}`);
}

// ---- 3. Umbral
const u = pkg.churn;
const e = ctl.evaluarUmbral(u.pred_prueba, u.umbral, 0.08, P);
igual(e.tp, u.matriz.tp, 'TP en prueba'); igual(e.fp, u.matriz.fp, 'FP en prueba'); igual(e.fn, u.matriz.fn, 'FN en prueba'); igual(e.tn, u.matriz.tn, 'TN en prueba');

// ---- 4. Asistente (SQLite en memoria con sql.js)
const initSqlJs = require(vend('sql-wasm.js'));
const SQL = await initSqlJs({ locateFile: (f) => vend(f) });
const db = new SQL.Database(fs.readFileSync(path.join(aqui, '..', 'data', 'patitas.db')));
globalThis.performance ??= { now: () => Date.now() };
const docs = db.exec("select doc_id, version, estado, texto from documentos")[0].values.map((v) => ({ doc_id: v[0], version: v[1], estado: v[2], texto: v[3] }));
const A = crearAsistente(db, { familias: pkg.meta.familias, sedes: pkg.meta.sedes, last4: pkg.asistente.last4, documentos: docs });
let aciertos = 0, total = 0;
for (const q of pkg.asistente.preguntas) {
  const r = A.responder(q.pregunta); const ev_ = A.evaluar(q.esperado, r); total++; aciertos += ev_.ok ? 1 : 0;
  const py = pkg.asistente.evaluacion.find((x) => x.id_pregunta === q.id && x.motor === 'determinista');
  igual(ev_.ok ? 1 : 0, py.acierto, `asistente ${q.id} (${q.tipo}) acierto`);
}
igual(aciertos / total, cifras.acierto_asistente, 'tasa de acierto del asistente');
for (const q of pkg.asistente.parafrasis) {
  const r = A.responder(q.pregunta); const ev_ = A.evaluar(q.esperado, r);
  const py = pkg.asistente.evaluacion.find((x) => x.id_pregunta === q.id);
  igual(ev_.ok ? 1 : 0, py.acierto, `paráfrasis ${q.id} acierto`);
}
// ataques directos al validador
igual(A.validar('select * from clientes; drop table clientes')[0], false, 'validador: rechaza varias sentencias');
igual(A.validar('delete from clientes')[0], false, 'validador: rechaza DELETE');
igual(A.validar('select id_cliente, sede from clientes')[0], false, 'validador: rechaza datos individuales');
igual(A.validar('select * from sqlite_master')[0], false, 'validador: rechaza tablas fuera de la lista blanca');
igual(A.validar('select sede, count(*) from clientes group by sede')[0], true, 'validador: acepta una consulta agregada');

console.log(`\n${pruebas - fallos}/${pruebas} pruebas conciliadas${fallos ? ` — ${fallos} FALLAN` : ''}`);
process.exit(fallos ? 1 : 0);
