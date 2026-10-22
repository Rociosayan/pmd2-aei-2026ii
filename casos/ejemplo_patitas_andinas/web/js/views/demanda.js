import { fmt, tabla, grafico, css, esc, cls } from '../ui.js';

export function render(root, { pkg }) {
  const F = pkg.pronostico, fams = pkg.meta.familias;
  root.innerHTML = `
  <h2>Pronóstico de demanda <span class="chip">Semana 10</span></h2>
  <p class="lead">Unidades <b>solicitadas</b> por semana y familia (no las atendidas: las ventas censuradas por falta de stock subestiman la demanda). Prueba final = últimas 4 semanas; tres ventanas de validación de 4 semanas con origen móvil; los mismos métodos, semanas y series en todas las comparaciones. Método elegido en validación: <b>${esc(F.metodo)}</b>.</p>
  <div class="card"><div class="ctl"><label>Familia<select id="d-fam">${fams.map((f) => `<option>${f}</option>`).join('')}</select></label></div>
    <div class="cv alto"><canvas id="d-ch"></canvas></div>
    <p class="lead" style="font-size:13px;margin:6px 0 0">Líneas punteadas: rango del error relativo del método en el backtesting (percentiles 10 y 90 = ${fmt.n(F.rango.p10, 2)} y ${fmt.n(F.rango.p90, 2)}).</p></div>
  <div class="grid g2" style="margin-top:14px">
    <div class="card"><h3>Backtesting: WAPE por método</h3>
      ${tabla([{ t: 'Método', k: 'metodo' }, { t: 'Val. 1', k: 'val_1', n: true, f: (v) => fmt.n(v, 3) }, { t: 'Val. 2', k: 'val_2', n: true, f: (v) => fmt.n(v, 3) }, { t: 'Val. 3', k: 'val_3', n: true, f: (v) => fmt.n(v, 3) },
        { t: 'Media validación', k: 'validación (media 3 ventanas)', n: true, f: (v) => `<b>${fmt.n(v, 3)}</b>` }, { t: 'Prueba', k: 'prueba final', n: true, f: (v) => fmt.n(v, 3) }], F.backtest)}
      <div class="note info">WAPE = suma de |error| semanal / suma de la demanda, sobre las 18 series (familia × sede). Un método estadístico debe superar al ingenuo; aquí la ganancia en <b>prueba</b> es pequeña (${fmt.n(F.backtest.find((r) => r.metodo === F.metodo)['prueba final'], 3)} frente a ${fmt.n(F.backtest.find((r) => r.metodo.startsWith('Ingenuo'))['prueba final'], 3)}), por eso el rango se usa como escenario.</div></div>
    <div class="card"><h3>Del error al negocio (total de 4 semanas, prueba)</h3>
      ${tabla([{ t: 'Método', k: 'metodo' }, { t: 'Sobran (uds)', k: 'sobra_uds', n: true, f: (v) => fmt.n(v) }, { t: 'Faltan (uds)', k: 'falta_uds', n: true, f: (v) => fmt.n(v) }, { t: 'Capital inmovilizado', k: 'capital_inmovilizado_S/', n: true, f: (v) => fmt.s(v) }, { t: 'Margen perdido', k: 'margen_perdido_S/', n: true, f: (v) => fmt.s(v) }], F.impacto)}
      <p class="lead" style="font-size:13px">Lo que sobra inmoviliza capital y espacio; lo que falta pierde margen. La decisión usa el total de cuatro semanas por familia.</p></div>
  </div>
  <div class="grid g2" style="margin-top:14px">
    <div class="card"><h3>Plan de noviembre (2 al 29)</h3>
      ${tabla([{ t: 'Familia', k: 'familia' }, { t: 'Pronóstico 4 sem.', k: 'unidades_pronosticadas_4sem', n: true, f: (v) => `<b>${fmt.n(v)}</b>` }, { t: 'Rango bajo', k: 'rango_bajo', n: true, f: (v) => fmt.n(v) }, { t: 'Rango alto', k: 'rango_alto', n: true, f: (v) => fmt.n(v) }, { t: 'Últimas 4 sem.', k: 'demanda_ultimas_4_semanas', n: true, f: (v) => fmt.n(v) }], F.plan)}</div>
    <div class="card"><h3>Demanda no atendida (censura)</h3>
      ${tabla([{ t: 'Familia', k: 'linea' }, { t: 'Solicitado', k: 'solicitado', n: true, f: (v) => fmt.n(v) }, { t: 'Faltante', k: 'faltante', n: true, f: (v) => fmt.n(v) }, { t: '% no atendido', k: '% demanda no atendida', n: true, f: (v) => fmt.n(v, 1) + ' %' }], F.censura)}
      <p class="lead" style="font-size:13px">Usar <code>atendido</code> como demanda reproduciría el sesgo de los quiebres de stock.</p></div>
  </div>`;
  function pintar(f) {
    const hist = F.historia[f];
    const labs = Object.keys(hist).map((k) => k.slice(0, 10)).concat(F.semanas_plan);
    const h = Object.values(hist), nH = h.length, pr = F.plan_semanal[f];
    const pad = (a, n) => Array(n).fill(null).concat(a);
    grafico('d-ch', { type: 'line', data: { labels: labs, datasets: [
      { label: 'solicitado', data: h.concat(Array(pr.length).fill(null)), borderColor: css('--azul'), pointRadius: 1.5, borderWidth: 1.6 },
      { label: 'pronóstico', data: pad([h[nH - 1], ...pr], nH - 1), borderColor: css('--naranja'), pointRadius: 3, borderWidth: 2.4 },
      { label: 'rango bajo', data: pad([h[nH - 1], ...pr.map((v) => v * (1 + F.rango.p10))], nH - 1), borderColor: css('--naranja'), borderDash: [5, 4], pointRadius: 0, borderWidth: 1 },
      { label: 'rango alto', data: pad([h[nH - 1], ...pr.map((v) => v * (1 + F.rango.p90))], nH - 1), borderColor: css('--naranja'), borderDash: [5, 4], pointRadius: 0, borderWidth: 1 }] },
      options: { scales: { x: { ticks: { maxTicksLimit: 12 } }, y: { title: { display: true, text: 'unidades por semana' }, beginAtZero: true } }, interaction: { mode: 'index', intersect: false } } });
  }
  root.querySelector('#d-fam').onchange = (e) => pintar(e.target.value);
  pintar(fams[0]);
}
