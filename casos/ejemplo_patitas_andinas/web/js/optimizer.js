// Optimización de noviembre 2026: mismo modelo entero mixto que el cuaderno (PuLP/CBC), resuelto aquí con HiGHS (WebAssembly).
// Sin dependencias del DOM: se prueba en Node contra las cifras del cuaderno.

const num = (v) => Number(v).toPrecision(12);
const clip0 = (v) => (v > 0 ? v : 0);

export function parametrosPorDefecto(pkg) {
  const p = pkg.optimizacion.parametros;
  return { ...p, efecto: p.efecto_base, escenario_demanda: 'base' };
}

/** Valor esperado incremental de contactar al cliente: p × efecto × multiplicador × CLV − coste del contacto − coste esperado del incentivo. */
export function ev(c, canal, P, efecto) {
  const m = canal === 'wa' ? 1 : P.mult_llamada;
  const coste = canal === 'wa' ? P.coste_wa : P.coste_llamada;
  return c.p_churn * efecto * m * clip0(c.clv6) - coste - P.uso_descuento * P.descuento * c.ticket_180;
}
export const costeContacto = (c, canal, P) => (canal === 'wa' ? P.coste_wa : P.coste_llamada) + P.uso_descuento * P.descuento * c.ticket_180;
export const pedidosInc = (c, canal, P, efecto) => c.p_churn * efecto * (canal === 'wa' ? 1 : P.mult_llamada) * (c.frec_90 / 3);

function demanda(fam, escenario) {
  return fam.map((f) => (escenario === 'bajo' ? f.dem_bajo : escenario === 'alto' ? f.dem_alto : f.dem_base));
}
const margenNeto = (f) => f.margen - f.devolucion * (f.coste + f.margen);

/** Construye el modelo en formato CPLEX-LP y lo resuelve. highs: instancia de HiGHS ya inicializada. */
export function resolver(highs, pkg, P, opciones = {}) {
  const cartera = pkg.cartera, fam = pkg.optimizacion.familias;
  const dem = opciones.dem || demanda(fam, P.escenario_demanda);
  const efecto = P.efecto;
  const canales = ['wa', 'llamada'];
  const cand = { wa: [], llamada: [] };
  cartera.forEach((c, i) => canales.forEach((ca) => { if (ev(c, ca, P, efecto) > 0) cand[ca].push(i); }));
  const obj = [], cons = [], bounds = [], bin = [], gen = [];
  const nombre = (ca, i) => (ca === 'wa' ? `xw${i}` : `xl${i}`);
  canales.forEach((ca) => cand[ca].forEach((i) => { obj.push(`${num(ev(cartera[i], ca, P, efecto))} ${nombre(ca, i)}`); bin.push(nombre(ca, i)); }));
  fam.forEach((f, k) => {
    obj.push(`${num(margenNeto(f) + P.phi * f.coste)} s${k}`);
    obj.push(`${num(-P.phi * f.coste)} y${k}`);
    gen.push(`y${k}`);
  });
  const hayX = cand.wa.length + cand.llamada.length > 0;
  if (hayX) {
    cons.push(`c_campana: ${canales.flatMap((ca) => cand[ca].map((i) => `${num(costeContacto(cartera[i], ca, P))} ${nombre(ca, i)}`)).join(' + ')} <= ${num(P.pres_campana)}`);
    if (cand.wa.length) cons.push(`c_wa: ${cand.wa.map((i) => nombre('wa', i)).join(' + ')} <= ${P.lim_wa}`);
    if (cand.llamada.length) cons.push(`c_llamada: ${cand.llamada.map((i) => nombre('llamada', i)).join(' + ')} <= ${P.lim_llamada}`);
    const sl = new Set(cand.llamada);
    cand.wa.filter((i) => sl.has(i)).forEach((i) => cons.push(`un_canal_${i}: ${nombre('wa', i)} + ${nombre('llamada', i)} <= 1`));
  }
  cons.push(`c_compra: ${fam.map((f, k) => `${num(f.coste)} y${k}`).join(' + ')} <= ${num(P.pres_compra)}`);
  cons.push(`c_almacen: ${fam.map((f, k) => `${num(f.espacio)} y${k}`).join(' + ')} <= ${num(P.almacen)}`);
  const desp = fam.map((f, k) => `${num(1 / P.upd)} s${k}`);
  canales.forEach((ca) => cand[ca].forEach((i) => desp.push(`${num(pedidosInc(cartera[i], ca, P, efecto))} ${nombre(ca, i)}`)));
  cons.push(`c_despachos: ${desp.join(' + ')} <= ${num(P.despachos)}`);
  fam.forEach((f, k) => {
    cons.push(`v_stock_${k}: s${k} - y${k} <= ${num(f.stock)}`);
    cons.push(`v_dem_${k}: s${k} <= ${num(dem[k])}`);
    cons.push(`cob_${k}: y${k} >= ${num(P.cob_min * dem[k] - f.stock)}`);
  });
  const lp = ['Maximize', ` obj: ${obj.join(' + ').replace(/\+ -/g, '- ')}`, 'Subject To', ...cons.map((c) => ` ${c.replace(/\+ -/g, '- ')}`),
    'Bounds', ...fam.map((_, k) => ` 0 <= s${k}`), ...fam.map((_, k) => ` 0 <= y${k}`), 'General', ` ${gen.join(' ')}`];
  if (bin.length) lp.push('Binary', ` ${bin.join(' ')}`);
  lp.push('End');
  const t0 = performance.now();
  const r = highs.solve(lp.join('\n'));
  const ms = performance.now() - t0;
  if (r.Status !== 'Optimal') return { estado: r.Status, ms, sel: { wa: [], llamada: [] }, y: fam.map(() => 0), s: fam.map(() => 0) };
  const val = (n) => (r.Columns[n] ? r.Columns[n].Primal : 0);
  const sel = { wa: cand.wa.filter((i) => val(nombre('wa', i)) > 0.5), llamada: cand.llamada.filter((i) => val(nombre('llamada', i)) > 0.5) };
  return { estado: 'Optimal', ms, sel, y: fam.map((_, k) => Math.round(val(`y${k}`))), s: fam.map((_, k) => val(`s${k}`)), dem, efecto, candidatos: cand.wa.length + cand.llamada.length };
}

/** Evalúa cualquier plan (óptimo o política actual) con las mismas fórmulas y comprueba las restricciones con tolerancia. */
export function evaluar(pkg, P, plan, opciones = {}) {
  const cartera = pkg.cartera, fam = pkg.optimizacion.familias;
  const dem = opciones.dem || plan.dem || demanda(fam, P.escenario_demanda);
  const efecto = opciones.efecto ?? P.efecto;
  let valRet = 0, costeC = 0, ped = 0;
  const n = {};
  ['wa', 'llamada'].forEach((ca) => {
    n[ca] = plan.sel[ca].length;
    plan.sel[ca].forEach((i) => { const c = cartera[i]; valRet += ev(c, ca, P, efecto); costeC += costeContacto(c, ca, P); ped += pedidosInc(c, ca, P, efecto); });
  });
  let compra = 0, alm = 0, vend = 0, margen = 0, okVend = true, okCob = true;
  const vendidas = fam.map((f, k) => {
    const v = Math.min(plan.s[k], f.stock + plan.y[k], dem[k]);
    compra += f.coste * plan.y[k]; alm += f.espacio * plan.y[k]; vend += v;
    margen += margenNeto(f) * v - P.phi * f.coste * (f.stock + plan.y[k] - v);
    if (f.stock + plan.y[k] < P.cob_min * dem[k] - 1e-6) okCob = false;
    return v;
  });
  const despachos = vend / P.upd + ped;
  const tol = 1e-6;
  const solapa = plan.sel.wa.filter((i) => plan.sel.llamada.includes(i)).length;
  const restricciones = {
    'presupuesto de campaña': costeC <= P.pres_campana + tol, 'límite WhatsApp': n.wa <= P.lim_wa + tol, 'límite llamadas': n.llamada <= P.lim_llamada + tol,
    'un canal por cliente': solapa === 0, 'presupuesto de compra': compra <= P.pres_compra + tol, 'almacenamiento': alm <= P.almacen + tol,
    'despachos': despachos <= P.despachos + tol, 'cobertura mínima por familia': okCob,
  };
  return { contactos_wa: n.wa, contactos_llamada: n.llamada, coste_campana: costeC, valor_retencion_6m: valRet, compra_S: compra, almacenamiento: alm,
    unidades_compradas: plan.y.reduce((a, b) => a + b, 0), unidades_vendidas: vend, despachos, margen_operacion_4sem: margen, restricciones,
    cumple_todo: Object.values(restricciones).every(Boolean), vendidas };
}

/** Política actual: primeros N compradores elegibles por id_cliente (WhatsApp) y reposición de la demanda de las últimas 4 semanas menos el stock, ajustada proporcionalmente. */
export function politicaActual(pkg, P, ajustar = true) {
  const cartera = pkg.cartera, fam = pkg.optimizacion.familias;
  const orden = cartera.map((c, i) => [c.id_cliente, i]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map((x) => x[1]);
  const yb = fam.map((f) => Math.max(0, Math.round(f.dem_ult4 - f.stock)));
  let k = 1;
  if (ajustar) {
    const cc = fam.reduce((a, f, j) => a + f.coste * yb[j], 0), aa = fam.reduce((a, f, j) => a + f.espacio * yb[j], 0);
    k = Math.min(1, P.pres_compra / cc, P.almacen / aa);
  }
  const y = yb.map((v) => Math.floor(v * k + 1e-9));
  const dem = demanda(fam, 'base');
  const s = fam.map((f, j) => Math.min(f.stock + y[j], dem[j]));
  return { sel: { wa: orden.slice(0, P.n_politica), llamada: [] }, y, s, dem };
}
