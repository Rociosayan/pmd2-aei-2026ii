// Carta X̄ de límites variables para la media semanal del tiempo de preparación, y umbral de churn. Funciones puras (se prueban en Node).

/** weekly: [{sede, semana, n, media, var}] ordenado por semana. baseIni/baseFin: 'YYYY-MM-DD' (lunes) del periodo base. */
export function cartaXbar(weekly, sede, baseIni, baseFin, k = 3) {
  const w = weekly.filter((r) => r.sede === sede && r.semana >= baseIni).sort((a, b) => (a.semana < b.semana ? -1 : 1));
  const base = w.filter((r) => r.semana >= baseIni && r.semana <= baseFin);
  if (base.length < 2) return { error: 'periodo base con menos de 2 semanas', filas: [] };
  const N = base.reduce((a, r) => a + r.n, 0);
  const mu0 = base.reduce((a, r) => a + r.n * r.media, 0) / N;
  const gl = base.reduce((a, r) => a + (r.n - 1), 0);
  const sigma0 = Math.sqrt(base.reduce((a, r) => a + (r.n - 1) * r.var, 0) / gl);
  const filas = w.map((r) => {
    const se = sigma0 / Math.sqrt(r.n);
    return { ...r, ucl: mu0 + k * se, lcl: mu0 - k * se, z: (r.media - mu0) / se, fase: r.semana <= baseFin ? 'base' : 'vigilancia' };
  });
  const z = filas.map((r) => r.z);
  const r1 = z.map((v) => Math.abs(v) > 3);
  const r2 = z.map((_, i) => { if (i < 2) return false; const v = z.slice(i - 2, i + 1); return (v.filter((x) => x > 2).length >= 2 && z[i] > 2) || (v.filter((x) => x < -2).length >= 2 && z[i] < -2); });
  const r3 = z.map((_, i) => { if (i < 7) return false; const v = z.slice(i - 7, i + 1); return v.every((x) => x > 0) || v.every((x) => x < 0); });
  filas.forEach((f, i) => { f.R1 = r1[i]; f.R2 = r2[i]; f.R3 = r3[i]; f.senal = r1[i] || r2[i] || r3[i]; });
  return { mu0, sigma0, semanasBase: base.length, nMedio: N / base.length, filas };
}

/** Matriz de confusión y valor económico de contactar a quien tenga p >= umbral. pred: [{p, y, clv6, ticket}] */
export function evaluarUmbral(pred, umbral, efecto, P) {
  let tp = 0, fp = 0, fn = 0, tn = 0, valorEsp = 0, valorReal = 0, coste = 0;
  pred.forEach((r) => {
    const c = r.p >= umbral;
    if (c && r.y === 1) tp++; else if (c) fp++; else if (r.y === 1) fn++; else tn++;
    if (c) {
      const cc = P.coste_wa + P.uso_descuento * P.descuento * r.ticket;
      valorEsp += r.p * efecto * Math.max(r.clv6, 0) - cc;
      valorReal += r.y * efecto * Math.max(r.clv6, 0) - cc;
      coste += cc;
    }
  });
  const cont = tp + fp;
  return { tp, fp, fn, tn, contactos: cont, precision: cont ? tp / cont : null, recall: tp + fn ? tp / (tp + fn) : null, valorEsp, valorReal, coste, pctCartera: cont / pred.length };
}

/** Intervalo de Wilson al 95 %. */
export function wilson(k, n, z = 1.96) {
  if (!n) return [NaN, NaN];
  const p = k / n, d = 1 + (z * z) / n, c = (p + (z * z) / (2 * n)) / d, h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [c - h, c + h];
}
