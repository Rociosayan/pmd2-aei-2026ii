import { fmt, tabla, chip, grafico, css, esc, descargarCSV, cls } from '../ui.js';
import { evaluarUmbral } from '../control.js';
import { ev as evCliente } from '../optimizer.js';

const GRILLA = Array.from({ length: 29 }, (_, i) => +(0.10 + 0.025 * i).toFixed(3));

export function render(root, { pkg, P }) {
  const ch = pkg.churn;
  const est = { efecto: P.efecto_base, umbral: ch.umbral, conjunto: 'prueba', sede: '', rfm: '', pmin: 0, orden: 'ev' };
  root.innerHTML = `
  <h2>Riesgo de abandono y valor económico <span class="chip">Semana 9</span></h2>
  <p class="lead">Compradores con al menos 2 entregas en los 180 días previos al corte. <b>Abandono</b> = ninguna entrega en los 60 días siguientes. Entrenamiento hasta abril de 2026, validación en mayo, prueba en junio, con <b>clientes disjuntos</b>. El umbral se eligió con validación (<b>${ch.umbral}</b>) y se aplica sin cambios a prueba.</p>
  <div class="card">
    <div class="ctl">
      <label>Conjunto<select id="r-conj"><option value="prueba">Prueba (junio 2026)</option><option value="validacion">Validación (mayo 2026)</option></select></label>
      <label>Efecto incremental supuesto <select id="r-ef">${Object.entries(P.efectos).map(([k, v]) => `<option value="${v}" ${v === P.efecto_base ? 'selected' : ''}>${v} (${k})</option>`).join('')}</select></label>
      <label>Umbral de probabilidad: <b id="r-um-v">${ch.umbral}</b><input id="r-um" type="range" min="0.10" max="0.80" step="0.025" value="${ch.umbral}"></label>
    </div>
    <div class="grid g4" id="r-kpis"></div>
    <div class="grid g2" style="margin-top:14px">
      <div><h4>Precision, recall y valor realizado por umbral</h4><div class="cv"><canvas id="r-ch"></canvas></div></div>
      <div><h4>Matriz de confusión</h4><div id="r-mat"></div><div id="r-lect" class="note info" style="margin-top:10px"></div></div>
    </div>
  </div>
  <h3>Modelos comparados (se elige por PR-AUC en validación)</h3>
  <div class="card">
    ${tabla([{ t: 'Conjunto', k: 'conjunto' }, { t: 'Modelo', k: 'modelo' }, { t: 'ROC-AUC', k: 'ROC_AUC', n: true, f: (v) => fmt.n(v, 3) }, { t: 'PR-AUC', k: 'PR_AUC', n: true, f: (v) => fmt.n(v, 3) }, { t: 'Brier', k: 'Brier', n: true, f: (v) => fmt.n(v, 3) }], ch.modelos_validacion)}
    <h4>Prueba final (informada una sola vez)</h4>
    ${tabla([{ t: 'Modelo', k: 'modelo' }, { t: 'ROC-AUC', k: 'ROC_AUC', n: true, f: (v) => fmt.n(v, 3) }, { t: 'PR-AUC', k: 'PR_AUC', n: true, f: (v) => fmt.n(v, 3) }, { t: 'IC95 % PR-AUC', k: (r) => (r['PR_AUC IC95% inf'] != null ? `${fmt.n(r['PR_AUC IC95% inf'], 2)} – ${fmt.n(r['PR_AUC IC95% sup'], 2)}` : '—'), n: true }], ch.final_prueba)}
    <div class="note">Con los mismos <b>${ch.contactos_prueba}</b> contactos, la regla simple de recencia captura <b>${ch.regla_tp_mismo_n}</b> abandonos y el modelo <b>${ch.matriz.tp}</b>. Si el efecto del contacto fuera 0, el valor de la campaña en prueba sería <b>${fmt.s(ch.efecto_cero_prueba)}</b> (solo costes).</div>
  </div>
  <div class="grid g2" style="margin-top:14px">
    <div class="card"><h3>RFM (cartera del 1-nov-2026)</h3>${tabla([{ t: 'Segmento', k: 'segmento_rfm' }, { t: 'Clientes decisión', k: 'clientes_decision', n: true, f: (v) => fmt.n(v) }, { t: 'Churn observado (prueba)', k: 'churn_observado', n: true, f: (v) => fmt.p(v) }, { t: 'CLV 6 m medio', k: 'clv6_medio_decision', n: true, f: (v) => fmt.s(v) }], ch.rfm)}
      <p class="lead" style="margin-top:8px;font-size:13px">CLV simplificado = contribución mensual media histórica × 6 meses; omite renovación futura, descuento y variación del margen.</p></div>
    <div class="card"><h3>¿Por qué predice así? (SHAP)</h3><img class="fig" src="img/fig_shap.png" alt="Importancia global SHAP y efecto de la recencia"><p style="font-size:13px" class="lead">SHAP explica el modelo, no la causa del abandono.</p></div>
  </div>
  <h3>Lista priorizada para revisión humana (cartera con consentimiento)</h3>
  <div class="card">
    <div class="ctl">
      <label>Sede<select id="l-sede"><option value="">Todas</option>${pkg.meta.sedes.map((s) => `<option>${s}</option>`).join('')}</select></label>
      <label>Segmento RFM<select id="l-rfm"><option value="">Todos</option>${[...new Set(pkg.cartera.map((c) => c.segmento_rfm))].map((s) => `<option>${s}</option>`).join('')}</select></label>
      <label>Probabilidad mínima<input id="l-p" type="number" min="0" max="1" step="0.05" value="0" style="width:90px"></label>
      <label>Ordenar por<select id="l-ord"><option value="ev">Valor esperado (WhatsApp)</option><option value="p">Probabilidad</option><option value="clv">CLV</option></select></label>
      <button class="btn sec" id="l-csv">Descargar CSV</button>
    </div>
    <div id="l-tab"></div>
  </div>`;

  const $r = (s) => root.querySelector(s);
  const datos = () => (est.conjunto === 'prueba' ? ch.pred_prueba : ch.pred_validacion);

  function pintar() {
    const d = datos();
    const e = evaluarUmbral(d, est.umbral, est.efecto, P);
    $r('#r-um-v').textContent = est.umbral;
    $r('#r-kpis').innerHTML = [
      ['Contactos', fmt.n(e.contactos), `${fmt.p(e.pctCartera)} de ${d.length} clientes`],
      ['Precision', fmt.p(e.precision), `${e.tp} verdaderos positivos`],
      ['Recall', fmt.p(e.recall), `${e.tp} de ${e.tp + e.fn} abandonos`],
      ['Falsos positivos', fmt.n(e.fp), 'contactos que habrían seguido comprando'],
      ['Valor esperado (S/)', `<span class="${cls(e.valorEsp)}">${fmt.s(e.valorEsp)}</span>`, 'con p × efecto × CLV − costes'],
      ['Valor realizado (S/)', `<span class="${cls(e.valorReal)}">${fmt.s(e.valorReal)}</span>`, 'con el abandono observado'],
    ].map(([l, v, dd]) => `<div class="card kpi"><div class="l">${l}</div><div class="v" style="font-size:22px">${v}</div><div class="d">${dd}</div></div>`).join('');
    $r('#r-mat').innerHTML = `<table><thead><tr><th></th><th class="n">No contactar</th><th class="n">Contactar</th></tr></thead><tbody>
      <tr><td>Sigue comprando</td><td class="n">${e.tn}</td><td class="n">${e.fp}</td></tr><tr><td>Abandona</td><td class="n">${e.fn}</td><td class="n">${e.tp}</td></tr></tbody></table>`;
    $r('#r-lect').innerHTML = est.efecto === 0
      ? '<b>Efecto 0:</b> contactar solo genera costes; ningún umbral crea valor. El modelo mide riesgo, no el efecto del contacto.'
      : `Con efecto ${est.efecto}, el umbral que maximiza el valor realizado en validación es <b>${ch.umbral}</b>. ${est.conjunto === 'prueba' ? 'Esta es la prueba final: no se reajusta el umbral.' : 'La validación se usó para elegirlo; úsela solo para ver la curva.'}`;
    const filas = GRILLA.map((t) => ({ t, ...evaluarUmbral(d, t, est.efecto, P) }));
    const vl = { id: 'vl', afterDatasetsDraw(c) { const x = c.scales.x.getPixelForValue(est.umbral); const { top, bottom } = c.chartArea; const g = c.ctx; g.save(); g.strokeStyle = css('--gris'); g.setLineDash([5, 4]); g.beginPath(); g.moveTo(x, top); g.lineTo(x, bottom); g.stroke(); g.restore(); } };
    grafico('r-ch', { type: 'line', plugins: [vl], data: { datasets: [
      { label: 'precision', data: filas.map((f) => ({ x: f.t, y: f.precision })), borderColor: css('--azul'), pointRadius: 0, yAxisID: 'y', spanGaps: true },
      { label: 'recall', data: filas.map((f) => ({ x: f.t, y: f.recall })), borderColor: css('--naranja'), pointRadius: 0, yAxisID: 'y' },
      { label: 'valor realizado (S/)', data: filas.map((f) => ({ x: f.t, y: f.valorReal })), borderColor: css('--verde'), pointRadius: 0, yAxisID: 'y2' }] },
      options: { scales: { x: { type: 'linear', title: { display: true, text: 'umbral de probabilidad' }, min: 0.1, max: 0.8 }, y: { min: 0, max: 1, title: { display: true, text: 'precision / recall' } }, y2: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'S/' } } }, interaction: { mode: 'nearest', intersect: false } } });
  }
  function lista() {
    let c = pkg.cartera.map((x) => ({ ...x, ev_wa: evCliente(x, 'wa', P, est.efecto) }));
    if (est.sede) c = c.filter((x) => x.sede === est.sede);
    if (est.rfm) c = c.filter((x) => x.segmento_rfm === est.rfm);
    c = c.filter((x) => x.p_churn >= est.pmin);
    c.sort((a, b) => (est.orden === 'p' ? b.p_churn - a.p_churn : est.orden === 'clv' ? b.clv6 - a.clv6 : b.ev_wa - a.ev_wa));
    $r('#l-tab').innerHTML = `<p class="lead" style="margin:0 0 6px">${fmt.n(c.length)} clientes · ${fmt.n(c.filter((x) => x.ev_wa > 0).length)} con valor esperado positivo por WhatsApp (efecto ${est.efecto}). Se muestran los primeros 25; identificadores seudonimizados.</p>` +
      tabla([{ t: 'Cliente', k: 'id_cliente' }, { t: 'Sede', k: 'sede' }, { t: 'RFM', k: 'segmento_rfm' }, { t: 'P(abandono)', k: 'p_churn', n: true, f: (v) => fmt.n(v, 3) }, { t: 'CLV 6 m', k: 'clv6', n: true, f: (v) => fmt.s(v) },
        { t: 'EV WhatsApp', k: 'ev_wa', n: true, f: (v) => `<span class="${cls(v)}">${fmt.s(v, 2)}</span>` }, { t: 'Razones principales (SHAP)', k: 'razones' }], c.slice(0, 25));
    $r('#l-csv').onclick = () => descargarCSV('lista_priorizada.csv', c.slice(0, 500).map((x) => ({ id_cliente: x.id_cliente, sede: x.sede, segmento_rfm: x.segmento_rfm, p_churn: x.p_churn, clv6: x.clv6, ev_whatsapp: x.ev_wa.toFixed(2), razones: x.razones })));
  }
  $r('#r-conj').onchange = (e) => { est.conjunto = e.target.value; pintar(); };
  $r('#r-ef').onchange = (e) => { est.efecto = +e.target.value; pintar(); lista(); };
  $r('#r-um').oninput = (e) => { est.umbral = +e.target.value; pintar(); };
  $r('#l-sede').onchange = (e) => { est.sede = e.target.value; lista(); };
  $r('#l-rfm').onchange = (e) => { est.rfm = e.target.value; lista(); };
  $r('#l-p').oninput = (e) => { est.pmin = +e.target.value || 0; lista(); };
  $r('#l-ord').onchange = (e) => { est.orden = e.target.value; lista(); };
  pintar(); lista();
}
