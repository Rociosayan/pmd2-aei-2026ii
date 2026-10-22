import { fmt, tabla, chip, grafico, css, esc } from '../ui.js';
import { cartaXbar } from '../control.js';

export function render(root, { pkg }) {
  const C = pkg.control;
  const semanas = [...new Set(C.semanal.map((r) => r.semana))].sort();
  const est = { sede: 'Lima', ini: C.base_ini, fin: C.base_fin };
  const opts = (sel) => semanas.map((s) => `<option ${s === sel ? 'selected' : ''}>${s}</option>`).join('');
  root.innerHTML = `
  <h2>Procesos internos: carta de control y anomalías <span class="chip">Semana 12</span></h2>
  <p class="lead">Carta X̄ de límites variables para la <b>media semanal del tiempo de preparación</b> de pedidos, una por sede (los niveles base difieren: Kruskal-Wallis p ≈ ${C.kruskal.p.toExponential(1)}). Los límites se estiman <b>solo</b> con el periodo base y no se ajustan con lo que se vigila. La meta de servicio (45 min) se dibuja aparte: no es un límite de control. Una señal indica que el proceso cambió, no por qué.</p>
  <div class="card">
    <div class="ctl">
      <label>Sede<select id="p-sede">${pkg.meta.sedes.map((s) => `<option>${s}</option>`).join('')}</select></label>
      <label>Inicio del periodo base<select id="p-ini">${opts(est.ini)}</select></label>
      <label>Fin del periodo base<select id="p-fin">${opts(est.fin)}</select></label>
      <button class="btn sec" id="p-reset">Periodo del Colab</button>
    </div>
    <div id="p-info"></div>
    <div class="cv alto"><canvas id="p-ch"></canvas></div>
    <div id="p-tab"></div>
  </div>
  <div class="grid g2" style="margin-top:14px">
    <div class="card"><h3>Protocolo de alertas</h3>${tabla([{ t: 'Señal', k: 'senal' }, { t: 'Responsable', k: 'responsable' }, { t: 'Acción', k: 'accion' }, { t: 'Plazo', k: 'plazo' }], C.protocolo)}</div>
    <div class="card"><h3>Devoluciones para revisar</h3>
      <p class="lead" style="font-size:13px">De ${fmt.n(C.devoluciones_resumen.total)} devoluciones, un puntaje z sobre el importe marcaría ${C.devoluciones_resumen.z_crudo} y sobre su logaritmo ${C.devoluciones_resumen.z_log} (inviable de revisar). La <b>regla de negocio</b> —devolución mayor que la venta que la originó— aísla <b>${C.devoluciones_resumen.regla}</b> casos. Son señales para revisar, <b>no</b> prueba de fraude.</p>
      ${tabla([{ t: 'Evento', k: 'id_evento' }, { t: 'Fecha', k: 'fecha_evento' }, { t: 'Sede', k: 'sede' }, { t: 'Familia', k: 'linea' }, { t: 'Reembolso', k: 'reembolso', n: true, f: (v) => fmt.s(v) }, { t: 'Venta', k: 'venta_linea', n: true, f: (v) => fmt.s(v) }, { t: 'Razón', k: 'ratio_vs_venta', n: true, f: (v) => fmt.n(v, 1) + '×' }], C.devoluciones_alerta)}</div>
  </div>
  <div class="card" style="margin-top:14px"><h3>Tiempos de preparación extremos (z robusto &gt; 3,5)</h3>
    <p class="lead" style="font-size:13px">${fmt.n(C.n_prep_alerta)} pedidos en el historial (≈ 0,4 %). Se muestran los 10 más largos; son eventos aislados salvo que formen un patrón por sede o día.</p>
    ${tabla([{ t: 'Pedido', k: 'id_pedido' }, { t: 'Sede', k: 'sede' }, { t: 'Fecha y hora', k: 'fecha_hora' }, { t: 'Minutos', k: 'minutos', n: true, f: (v) => fmt.n(v, 1) }, { t: 'z robusto', k: 'z_log', n: true, f: (v) => fmt.n(v, 1) }], C.preparacion_alerta.slice(0, 10))}</div>`;
  const $r = (s) => root.querySelector(s);
  function pintar() {
    const r = cartaXbar(C.semanal, est.sede, est.ini, est.fin);
    if (r.error) { $r('#p-info').innerHTML = `<div class="note bad">${esc(r.error)}</div>`; return; }
    const vig = r.filas.filter((f) => f.fase === 'vigilancia'), base = r.filas.filter((f) => f.fase === 'base');
    const sig = vig.filter((f) => f.senal), sigBase = base.filter((f) => f.senal);
    $r('#p-info').innerHTML = `<div class="grid g4" style="margin-bottom:10px">
      <div class="card kpi"><div class="l">μ₀ (media base)</div><div class="v" style="font-size:22px">${fmt.n(r.mu0, 1)} min</div><div class="d">σ₀ dentro de semana ${fmt.n(r.sigma0, 1)} min</div></div>
      <div class="card kpi"><div class="l">Semanas en el periodo base</div><div class="v" style="font-size:22px">${r.semanasBase}</div><div class="d">${r.semanasBase >= 30 ? chip('≥ 30: suficiente', 'ok') : chip('< 30: limitación', 'bad')} · ${fmt.n(r.nMedio)} pedidos/semana</div></div>
      <div class="card kpi"><div class="l">Señales en vigilancia</div><div class="v" style="font-size:22px">${sig.length} / ${vig.length}</div><div class="d">primera: ${sig[0] ? sig[0].semana : '—'}</div></div>
      <div class="card kpi"><div class="l">Señales en el periodo base</div><div class="v" style="font-size:22px">${sigBase.length}</div><div class="d">${sigBase.length ? 'se documentan, no se borran' : 'base estable'}</div></div></div>
      ${est.fin > C.base_fin ? '<div class="note">El periodo base incluye semanas de temporada alta (noviembre–diciembre): la línea base absorbe el corrimiento y oculta señales. Compare con el periodo del Colab.</div>' : ''}
      ${sig.some((f) => f.semana >= '2025-11-01' && f.semana <= '2026-01-15') ? '<div class="note info">Las señales de noviembre–diciembre de 2025 coinciden con la temporada alta (causa conocida): requieren una línea base estacional antes de automatizar alertas.</div>' : ''}`;
    const labs = r.filas.map((f) => f.semana);
    const ini = labs.indexOf(est.ini), fin = labs.indexOf(est.fin);
    const bandas = { id: 'bandas', beforeDatasetsDraw(c) { const x = c.scales.x, g = c.ctx, { top, bottom } = c.chartArea; if (ini < 0 || fin < 0) return; const a = x.getPixelForValue(ini), b = x.getPixelForValue(fin); g.save(); g.fillStyle = 'rgba(42,138,91,.10)'; g.fillRect(a, top, b - a, bottom - top); g.restore(); } };
    grafico('p-ch', { type: 'line', plugins: [bandas], data: { labels: labs, datasets: [
      { label: 'media semanal', data: r.filas.map((f) => f.media), borderColor: css('--azul'), borderWidth: 1.4, pointRadius: r.filas.map((f) => (f.senal ? 4.5 : 2)), pointBackgroundColor: r.filas.map((f) => (f.senal ? css('--rojo') : css('--azul'))), pointBorderColor: r.filas.map((f) => (f.senal ? css('--rojo') : css('--azul'))) },
      { label: 'límite superior', data: r.filas.map((f) => f.ucl), borderColor: css('--rojo'), borderWidth: 1, pointRadius: 0, stepped: 'middle' },
      { label: 'límite inferior', data: r.filas.map((f) => f.lcl), borderColor: css('--rojo'), borderWidth: 1, pointRadius: 0, stepped: 'middle' },
      { label: 'μ₀', data: r.filas.map(() => r.mu0), borderColor: css('--gris'), borderWidth: 1, pointRadius: 0 },
      { label: 'meta de servicio 45 min (no es límite)', data: r.filas.map(() => C.meta_min), borderColor: css('--naranja'), borderDash: [6, 4], borderWidth: 1.2, pointRadius: 0 }] },
      options: { scales: { x: { ticks: { maxTicksLimit: 14 } }, y: { title: { display: true, text: 'minutos' } } }, interaction: { mode: 'index', intersect: false } } });
    $r('#p-tab').innerHTML = sig.length ? '<h4>Semanas con señal</h4>' + tabla([{ t: 'Semana', k: 'semana' }, { t: 'n', k: 'n', n: true }, { t: 'Media (min)', k: 'media', n: true, f: (v) => fmt.n(v, 1) }, { t: 'z', k: 'z', n: true, f: (v) => fmt.n(v, 1) }, { t: 'Regla', k: (f) => [f.R1 && 'R1 fuera de 3σ', f.R2 && 'R2 dos de tres fuera de 2σ', f.R3 && 'R3 ocho seguidos del mismo lado'].filter(Boolean).join(' · ') }], sig.slice(0, 30)) : '<p class="lead">Sin señales en el periodo vigilado.</p>';
  }
  $r('#p-sede').onchange = (e) => { est.sede = e.target.value; pintar(); };
  $r('#p-ini').onchange = (e) => { est.ini = e.target.value; pintar(); };
  $r('#p-fin').onchange = (e) => { est.fin = e.target.value; pintar(); };
  $r('#p-reset').onclick = () => { est.ini = C.base_ini; est.fin = C.base_fin; $r('#p-ini').value = est.ini; $r('#p-fin').value = est.fin; pintar(); };
  pintar();
}
