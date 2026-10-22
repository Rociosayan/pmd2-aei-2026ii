import { $, $$, esc } from './ui.js';
import { parametrosPorDefecto } from './optimizer.js';
import * as resumen from './views/resumen.js';
import * as riesgo from './views/riesgo.js';
import * as demanda from './views/demanda.js';
import * as optimizacion from './views/optimizacion.js';
import * as procesos from './views/procesos.js';
import * as gobierno from './views/gobierno.js';
import * as asistente from './views/asistente.js';
import * as calidad from './views/calidad.js';

const VISTAS = [
  ['resumen', 'Resumen', 'Decisión', resumen], ['riesgo', 'Riesgo y valor', 'Semana 9', riesgo], ['demanda', 'Demanda', 'Semana 10', demanda], ['optimizacion', 'Optimización', 'Semana 11', optimizacion],
  ['procesos', 'Procesos', 'Semana 12', procesos], ['gobierno', 'Gobierno', 'Semana 13', gobierno], ['asistente', 'Asistente', 'Semana 14', asistente], ['calidad', 'Calidad', 'Semanas 15–16', calidad],
];
let pkg, P, highsP, dbP;
const getHighs = () => (highsP ??= Module({ locateFile: (f) => `vendor/${f}` }));
const getDb = () => (dbP ??= (async () => {
  const [SQL, buf] = await Promise.all([initSqlJs({ locateFile: (f) => `vendor/${f}` }), fetch('data/patitas.db').then((r) => { if (!r.ok) throw new Error('no se pudo descargar patitas.db'); return r.arrayBuffer(); })]);
  return new SQL.Database(new Uint8Array(buf));
})());

const hechas = new Set();
function mostrar(id) {
  const v = VISTAS.find((x) => x[0] === id) || VISTAS[0];
  $$('nav.tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.id === v[0]));
  $$('section.view').forEach((s) => s.classList.toggle('on', s.id === 'v-' + v[0]));
  if (!hechas.has(v[0])) {
    hechas.add(v[0]);
    try { v[3].render($('#v-' + v[0]), { pkg, P, getHighs, getDb }); } catch (e) { console.error(e); $('#v-' + v[0]).innerHTML = `<div class="note bad">Error al mostrar esta sección: ${esc(e.message)}</div>`; }
  }
  if (location.hash !== '#' + v[0]) history.replaceState(null, '', '#' + v[0]);
  window.scrollTo({ top: 0 });
}

async function iniciar() {
  try { pkg = await (await fetch('data/paquete_app.json')).json(); } catch (e) { $('#app').innerHTML = `<div class="note bad">No se pudo cargar data/paquete_app.json (${esc(e.message)}). Abra la página desde un servidor, no desde el archivo.</div>`; return; }
  P = parametrosPorDefecto(pkg);
  $('#meta').innerHTML = `Datos al ${esc(pkg.meta.fecha_datos)} · versión <code>${esc(pkg.meta.version_datos)}</code> · importes en soles (S/)`;
  $('nav.tabs').innerHTML = VISTAS.map(([id, t, s]) => `<button data-id="${id}" role="tab"><span class="sem">${s}</span>${t}</button>`).join('');
  $('#app').innerHTML = VISTAS.map(([id]) => `<section class="view" id="v-${id}"></section>`).join('');
  $('nav.tabs').onclick = (e) => { const b = e.target.closest('button'); if (b) mostrar(b.dataset.id); };
  window.addEventListener('hashchange', () => mostrar(location.hash.slice(1)));
  mostrar(location.hash.slice(1) || 'resumen');
}
iniciar();
