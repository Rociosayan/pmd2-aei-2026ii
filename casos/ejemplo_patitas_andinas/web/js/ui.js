// Utilidades de interfaz: formatos, tablas HTML y gráficos (Chart.js).
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

const nf = (d) => new Intl.NumberFormat('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmt = {
  n: (v, d = 0) => (v == null || Number.isNaN(v) ? '—' : nf(d).format(v)),
  s: (v, d = 0) => (v == null || Number.isNaN(v) ? '—' : `${v < 0 ? '−' : ''}S/ ${nf(d).format(Math.abs(v))}`),
  p: (v, d = 1) => (v == null || Number.isNaN(v) ? '—' : `${nf(d).format(100 * v)} %`),
  sg: (v, d = 0) => (v == null || Number.isNaN(v) ? '—' : `${v >= 0 ? '+' : '−'}S/ ${nf(d).format(Math.abs(v))}`),
};
export const cls = (v) => (v > 0 ? 'pos' : v < 0 ? 'neg' : '');

/** cols: [{t:'Título', k:'campo' | (r)=>valor, f:(v,r)=>html, n:true}] */
export function tabla(cols, rows, { cls: rowCls, id } = {}) {
  const th = cols.map((c) => `<th class="${c.n ? 'n' : ''}">${esc(c.t)}</th>`).join('');
  const body = rows.map((r) => {
    const tds = cols.map((c) => {
      const v = typeof c.k === 'function' ? c.k(r) : r[c.k];
      const h = c.f ? c.f(v, r) : esc(v ?? '—');
      return `<td class="${c.n ? 'n' : ''}">${h}</td>`;
    }).join('');
    return `<tr class="${rowCls ? rowCls(r) : ''}">${tds}</tr>`;
  }).join('');
  return `<div class="tscroll"><table${id ? ` id="${id}"` : ''}><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>`;
}
export const chip = (txt, tipo = '') => `<span class="chip ${tipo}">${esc(txt)}</span>`;
export const ok = (b) => chip(b ? 'cumple' : 'NO cumple', b ? 'ok' : 'bad');
export const kpi = (l, v, d = '') => `<div class="card kpi"><div class="l">${l}</div><div class="v">${v}</div><div class="d">${d}</div></div>`;
export const barra = (frac) => `<div class="bar"><i class="${frac >= 0.995 ? 'full' : ''}" style="width:${Math.min(100, Math.max(0, frac * 100)).toFixed(1)}%"></i></div>`;

const charts = {};
export function grafico(id, config) {
  if (charts[id]) charts[id].destroy();
  const el = document.getElementById(id);
  if (!el) return null;
  config.options = Object.assign({ responsive: true, maintainAspectRatio: false, animation: false }, config.options || {});
  const col = css('--muted'), grid = css('--line');
  Chart.defaults.color = col; Chart.defaults.borderColor = grid; Chart.defaults.font.family = 'system-ui, -apple-system, "Segoe UI", sans-serif';
  charts[id] = new Chart(el, config);
  return charts[id];
}
export function descargarCSV(nombre, filas) {
  if (!filas.length) return;
  const cols = Object.keys(filas[0]);
  const csv = [cols.join(','), ...filas.map((f) => cols.map((c) => `"${String(f[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = nombre; a.click(); URL.revokeObjectURL(a.href);
}
export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
