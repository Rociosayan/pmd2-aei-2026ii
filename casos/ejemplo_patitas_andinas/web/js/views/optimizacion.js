import { fmt, tabla, chip, ok, grafico, css, esc, barra, cls, descargarCSV, debounce } from '../ui.js';
import * as opt from '../optimizer.js';

export function render(root, { pkg, P, getHighs }) {
  const O = pkg.optimizacion, fam = O.familias;
  const est = { ...P };
  const sli = (id, l, v, min, max, step) => `<label>${l}<input id="${id}" type="number" value="${v}" min="${min}" max="${max}" step="${step}" style="width:110px"></label>`;
  root.innerHTML = `
  <h2>Optimización de recursos <span class="chip">Semana 11</span></h2>
  <p class="lead">Un solo programa entero mixto decide <b>a quién contactar y por qué canal</b>, y <b>cuántas unidades comprar de cada familia</b>, con presupuesto de campaña, compra, almacenamiento, despachos y cobertura mínima. Se resuelve aquí mismo con HiGHS (WebAssembly) y se compara con la <b>política actual</b> bajo las mismas hipótesis. Retención (6 meses) y operación (4 semanas) se muestran por separado.</p>
  <div class="card">
    <div class="ctl">
      <label>Efecto incremental supuesto<select id="o-ef">${Object.entries(P.efectos).map(([k, v]) => `<option value="${v}" ${v === P.efecto_base ? 'selected' : ''}>${v} (${k})</option>`).join('')}</select></label>
      <label>Demanda<select id="o-dem"><option value="base">Pronóstico base</option><option value="bajo">Rango bajo</option><option value="alto">Rango alto</option></select></label>
      ${sli('o-compra', 'Presupuesto de compra (S/)', P.pres_compra, 0, 200000, 500)}${sli('o-alm', 'Almacenamiento', P.almacen, 0, 5000, 25)}
      ${sli('o-desp', 'Despachos', P.despachos, 0, 5000, 25)}${sli('o-camp', 'Presupuesto de campaña (S/)', P.pres_campana, 0, 20000, 100)}${sli('o-llam', 'Máx. llamadas', P.lim_llamada, 0, 500, 10)}
      <button class="btn sec" id="o-reset">Valores del enunciado</button>
    </div>
    <div id="o-estado"></div>
  </div>
  <div id="o-res"><div class="loading">Cargando el solver…</div></div>
  <h3>Sensibilidad calculada en el Colab (PuLP / CBC)</h3>
  <div class="card" id="o-sens"></div>
  <div class="grid g2" style="margin-top:14px">
    <div class="card"><h3>¿Qué restricción manda? (precios sombra del Colab)</h3>${tabla([{ t: 'Recurso', k: 'recurso' }, { t: 'Usado', k: 'usado', n: true, f: (v) => fmt.n(v, 1) }, { t: 'Límite', k: 'límite', n: true, f: (v) => fmt.n(v) }, { t: '% usado', k: '% usado', n: true, f: (v) => fmt.n(v, 1) + ' %' }, { t: 'Valor de +1 unidad', k: 'precio sombra (S/ por unidad)', n: true, f: (v) => (v == null ? '—' : fmt.n(v, 3)) }], O.uso_recursos)}
      <p class="lead" style="font-size:13px">El presupuesto de compra es la restricción activa: cada sol adicional de compra aporta ≈ S/ ${fmt.n(O.uso_recursos[0]['precio sombra (S/ por unidad)'], 2)} de margen (aproximación de la relajación lineal).</p></div>
    <div class="card"><h3>Punto de equilibrio del efecto</h3>${tabla([{ t: 'Canal', k: 'canal' }, { t: 'Efecto mínimo', k: 'efecto_equilibrio_minimo', n: true, f: (v) => fmt.n(v, 3) }, { t: 'Mediana de la cartera', k: 'mediana_cartera', n: true, f: (v) => fmt.n(v, 3) }, { t: 'Clientes rentables al efecto base', k: 'clientes_con_equilibrio_menor_al_efecto_medio', n: true }], O.equilibrio)}
      <p class="lead" style="font-size:13px">Por debajo del efecto de equilibrio contactar no se paga, aunque el modelo acierte.</p></div>
  </div>`;
  const $r = (s) => root.querySelector(s);

  // sensibilidad precalculada
  const efs = [...new Set(O.sensibilidad.map((r) => r.efecto))];
  const escs = [...new Set(O.sensibilidad.map((r) => r.escenario))];
  $r('#o-sens').innerHTML = tabla([{ t: 'Escenario operativo', k: 'esc' }, ...efs.flatMap((e) => [
    { t: `Contactos (efecto ${e})`, k: (r) => r.c[e], n: true }, { t: `Retención 6 m (efecto ${e})`, k: (r) => r.v[e], n: true }]), { t: 'Compra (S/)', k: 'compra', n: true }, { t: 'Margen operación 4 sem.', k: 'margen', n: true }],
  escs.map((s) => {
    const f = (e) => O.sensibilidad.find((r) => r.escenario === s && r.efecto === e);
    const b = f(O.parametros.efecto_base);
    const inf = b.estado !== 'Optimal';
    return { esc: s, c: Object.fromEntries(efs.map((e) => [e, inf ? 'infactible' : fmt.n(f(e).contactos)])), v: Object.fromEntries(efs.map((e) => [e, inf ? 'infactible' : fmt.s(f(e).valor_retencion_6m)])),
      compra: inf ? 'infactible' : fmt.s(b.compra_S), margen: inf ? 'infactible' : fmt.s(b.margen_operacion_4sem) };
  })) + '<p class="lead" style="font-size:13px;margin-top:8px">Una solución no óptima o infactible no se presenta como resultado: con −25 % de presupuesto de compra no se puede cubrir la demanda mínima.</p>';

  let corr = 0;
  async function resolver() {
    const mi = ++corr;
    $r('#o-estado').innerHTML = '<span class="chip warn">resolviendo…</span>';
    let highs; try { highs = await getHighs(); } catch (e) { $r('#o-res').innerHTML = `<div class="note bad">No se pudo cargar el solver: ${esc(e.message)}</div>`; return; }
    await new Promise((r) => setTimeout(r, 10));
    const sol = opt.resolver(highs, pkg, est);
    if (mi !== corr) return;
    const polB = opt.politicaActual(pkg, est, false), polA = opt.politicaActual(pkg, est, true);
    const eP = opt.evaluar(pkg, est, polA), ePB = opt.evaluar(pkg, est, polB);
    if (sol.estado !== 'Optimal') {
      $r('#o-estado').innerHTML = `<span class="chip bad">Estado del solver: ${esc(sol.estado)}</span> <span style="color:var(--muted)">No hay solución factible con estos límites; no se muestra una solución como óptima.</span>`;
      $r('#o-res').innerHTML = '<div class="note bad">Relaje un límite (por ejemplo, el presupuesto de compra o la cobertura mínima) o reduzca la demanda.</div>'; return;
    }
    const eS = opt.evaluar(pkg, est, sol);
    const defecto = ['pres_compra', 'almacen', 'despachos', 'pres_campana', 'lim_llamada'].every((k) => est[k] === P[k]) && est.efecto === P.efecto_base && est.escenario_demanda === 'base';
    const nb = O.optimo.ev;
    const dif = Math.abs(eS.margen_operacion_4sem - nb.margen_operacion_4sem);
    $r('#o-estado').innerHTML = `<span class="chip ok">Estado del solver: Optimal</span> <span class="chip gris">HiGHS · ${fmt.n(sol.ms, 0)} ms · ${sol.candidatos} contactos candidatos (EV&gt;0)</span> ${eS.cumple_todo ? ok(true) + ' <span style="color:var(--muted)">todas las restricciones verificadas con tolerancia 1e-6</span>' : ok(false)}
      ${defecto ? (dif < 1 ? chip(`concilia con el Colab (Δ margen ${fmt.s(dif, 2)})`, 'ok') : chip('NO concilia con el Colab', 'bad')) : chip('escenario distinto al del Colab', 'gris')}`;
    const filas = [
      ['Contactos por WhatsApp', fmt.n(eP.contactos_wa), fmt.n(eS.contactos_wa), eS.contactos_wa - eP.contactos_wa, 0],
      ['Contactos por llamada', fmt.n(eP.contactos_llamada), fmt.n(eS.contactos_llamada), eS.contactos_llamada - eP.contactos_llamada, 0],
      ['Coste de campaña', fmt.s(eP.coste_campana), fmt.s(eS.coste_campana), eS.coste_campana - eP.coste_campana, 1],
      ['Valor de retención a 6 meses', fmt.s(eP.valor_retencion_6m), fmt.s(eS.valor_retencion_6m), eS.valor_retencion_6m - eP.valor_retencion_6m, 1],
      ['Compra de reposición', fmt.s(eP.compra_S), fmt.s(eS.compra_S), eS.compra_S - eP.compra_S, 1],
      ['Almacenamiento usado', fmt.n(eP.almacenamiento, 1), fmt.n(eS.almacenamiento, 1), eS.almacenamiento - eP.almacenamiento, 0],
      ['Unidades vendidas (4 sem.)', fmt.n(eP.unidades_vendidas), fmt.n(eS.unidades_vendidas), eS.unidades_vendidas - eP.unidades_vendidas, 0],
      ['Despachos usados', fmt.n(eP.despachos), fmt.n(eS.despachos), eS.despachos - eP.despachos, 0],
      ['Margen de operación a 4 semanas', fmt.s(eP.margen_operacion_4sem), fmt.s(eS.margen_operacion_4sem), eS.margen_operacion_4sem - eP.margen_operacion_4sem, 1],
    ];
    const rest = Object.keys(eS.restricciones);
    const usoRes = [['Presupuesto de compra', eS.compra_S, est.pres_compra], ['Almacenamiento', eS.almacenamiento, est.almacen], ['Despachos', eS.despachos, est.despachos], ['Presupuesto de campaña', eS.coste_campana, est.pres_campana], ['Llamadas', eS.contactos_llamada, est.lim_llamada]];
    $r('#o-res').innerHTML = `
    <div class="grid g2">
      <div class="card"><h3>Política actual vs propuesta óptima</h3>
        ${tabla([{ t: 'Indicador', k: 0 }, { t: 'Política actual (ajustada)', k: 1, n: true }, { t: 'Propuesta óptima', k: 2, n: true, f: (v) => `<b>${v}</b>` }, { t: 'Diferencia', k: 3, n: true, f: (v, r) => `<span class="${r[4] ? cls(v) : ''}">${r[4] ? fmt.sg(v) : (v > 0 ? '+' : '') + fmt.n(v, 0)}</span>` }], filas)}
        <div class="note info" style="margin-top:10px">La política actual, <b>sin ajustar</b>, necesita ${fmt.s(ePB.compra_S)} de compra y ${fmt.n(ePB.almacenamiento)} de almacenamiento: viola ${Object.entries(ePB.restricciones).filter(([, v]) => !v).map(([k]) => k).join(', ') || 'ninguna restricción'}. Para comparar se ajusta proporcionalmente a presupuesto y almacenamiento.</div>
        <p class="lead" style="font-size:13px;margin:8px 0 0">Los valores de retención (6 meses) y operación (4 semanas) <b>no se suman</b>: tienen horizontes distintos y las compras de los clientes retenidos se valoran solo en el CLV.</p></div>
      <div class="card"><h3>Uso de recursos y restricciones</h3>
        ${tabla([{ t: 'Recurso', k: 0 }, { t: 'Usado / límite', k: 1, n: true }, { t: '', k: 2, f: (v) => barra(v) }], usoRes.map(([n, u, l]) => [n, `${fmt.n(u, 1)} / ${fmt.n(l)}`, l ? u / l : 0]))}
        <h4>Verificación independiente</h4><div>${rest.map((k) => `${esc(k)}: ${ok(eS.restricciones[k])}`).join(' · ')}</div></div>
    </div>
    <div class="grid g2" style="margin-top:14px">
      <div class="card"><h3>Reposición por familia</h3><div class="cv"><canvas id="o-ch"></canvas></div></div>
      <div class="card"><h3>Detalle por familia</h3><div id="o-rep"></div></div>
    </div>
    <div class="card" style="margin-top:14px"><h3>Clientes a contactar (${eS.contactos_wa + eS.contactos_llamada})</h3><div class="ctl"><button class="btn sec" id="o-csv">Descargar CSV para revisión humana</button></div><div id="o-lista"></div></div>`;
    grafico('o-ch', { type: 'bar', data: { labels: fam.map((f) => f.familia), datasets: [{ label: 'Política actual (ajustada)', data: polA.y, backgroundColor: css('--gris') }, { label: 'Propuesta óptima', data: sol.y, backgroundColor: css('--azul') }] },
      options: { scales: { y: { title: { display: true, text: 'unidades a comprar' }, beginAtZero: true }, x: { ticks: { maxRotation: 30, font: { size: 10 } } } } } });
    const dm = sol.dem;
    $r('#o-rep').innerHTML = tabla([{ t: 'Familia', k: 'f' }, { t: 'Stock', k: 'st', n: true }, { t: 'Demanda', k: 'dm', n: true }, { t: 'Compra política', k: 'cp', n: true }, { t: 'Compra óptima', k: 'co', n: true, f: (v) => `<b>${v}</b>` }, { t: 'Cobertura óptima', k: 'cb', n: true }],
      fam.map((f, k) => ({ f: f.familia, st: f.stock, dm: fmt.n(dm[k]), cp: polA.y[k], co: sol.y[k], cb: fmt.p(Math.min(1, (f.stock + sol.y[k]) / dm[k]), 0) })));
    const sel = [...sol.sel.wa.map((i) => ['WhatsApp', i]), ...sol.sel.llamada.map((i) => ['Llamada', i])].map(([ca, i]) => ({ canal: ca, ...pkg.cartera[i], ev: opt.ev(pkg.cartera[i], ca === 'WhatsApp' ? 'wa' : 'llamada', est, est.efecto) }))
      .sort((a, b) => b.ev - a.ev);
    $r('#o-lista').innerHTML = (sel.length ? tabla([{ t: 'Cliente', k: 'id_cliente' }, { t: 'Canal', k: 'canal' }, { t: 'Sede', k: 'sede' }, { t: 'P(abandono)', k: 'p_churn', n: true, f: (v) => fmt.n(v, 3) }, { t: 'CLV 6 m', k: 'clv6', n: true, f: (v) => fmt.s(v) }, { t: 'EV', k: 'ev', n: true, f: (v) => fmt.s(v, 2) }, { t: 'Razones (SHAP)', k: 'razones' }], sel.slice(0, 30))
      : '<div class="note">Con este efecto ningún contacto tiene valor esperado positivo: el óptimo es <b>no contactar</b>.</div>') + (sel.length > 30 ? `<p class="lead" style="font-size:13px">Se muestran 30 de ${sel.length}; descargue el CSV para la lista completa.</p>` : '');
    const csv = $r('#o-csv'); if (csv) csv.onclick = () => descargarCSV('contactos_recomendados.csv', sel.map((s) => ({ id_cliente: s.id_cliente, canal: s.canal, sede: s.sede, p_churn: s.p_churn, clv6: s.clv6, ev: s.ev.toFixed(2), razones: s.razones })));
  }
  const rs = debounce(resolver, 300);
  const num = (id, k) => { $r(id).oninput = (e) => { est[k] = +e.target.value; rs(); }; };
  num('#o-compra', 'pres_compra'); num('#o-alm', 'almacen'); num('#o-desp', 'despachos'); num('#o-camp', 'pres_campana'); num('#o-llam', 'lim_llamada');
  $r('#o-ef').onchange = (e) => { est.efecto = +e.target.value; resolver(); };
  $r('#o-dem').onchange = (e) => { est.escenario_demanda = e.target.value; resolver(); };
  $r('#o-reset').onclick = () => { Object.assign(est, P, { efecto: P.efecto_base, escenario_demanda: 'base' }); ['compra:pres_compra', 'alm:almacen', 'desp:despachos', 'camp:pres_campana', 'llam:lim_llamada'].forEach((s) => { const [i, k] = s.split(':'); $r('#o-' + i).value = P[k]; }); $r('#o-ef').value = P.efecto_base; $r('#o-dem').value = 'base'; resolver(); };
  resolver();
}
