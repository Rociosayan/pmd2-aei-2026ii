import { fmt, tabla, chip, esc } from '../ui.js';

export function render(root, { pkg }) {
  const G = pkg.gobierno;
  const aud = (rows) => tabla([{ t: 'Variable', k: 'variable' }, { t: 'Grupo', k: 'grupo' }, { t: 'n', k: 'n', n: true }, { t: 'Abandonos', k: 'abandonos', n: true }, { t: 'Contactados', k: 'contactados', n: true },
    { t: 'Selección', k: 'tasa_seleccion', n: true, f: (v) => fmt.p(v) }, { t: 'Recall (IC95 %)', k: (r) => (r.abandonos ? `${fmt.p(r.recall, 0)} (${fmt.p(r.recall_IC_inf, 0)}–${fmt.p(r.recall_IC_sup, 0)})` : '—'), n: true },
    { t: 'FPR (IC95 %)', k: (r) => `${fmt.p(r.FPR, 0)} (${fmt.p(r.FPR_IC_inf, 0)}–${fmt.p(r.FPR_IC_sup, 0)})`, n: true }, { t: 'Estado', k: 'limitada', f: (v) => (v ? chip('limitada: no interpretar', 'warn') : chip('denominador suficiente', 'ok')) }], rows, { cls: (r) => (r.limitada ? '' : '') });
  root.innerHTML = `
  <h2>Gobierno, auditoría y explicabilidad <span class="chip">Semana 13</span></h2>
  <p class="lead">El modelo se usa <b>solo para priorizar listas que una persona revisa</b>, con consentimiento vigente, datos seudonimizados y sin datos sensibles. Esta sección documenta contrato, linaje, roles, auditoría por subgrupos con sus denominadores, explicabilidad y normativa con fuentes.</p>
  <div class="grid g2">
    <div class="card"><h3>Roles</h3>${tabla([{ t: 'Rol', k: 'rol' }, { t: 'Asignado a (propuesta)', k: 'asignado a (propuesta)' }, { t: 'Responsabilidad', k: 'responsabilidad' }], G.roles)}</div>
    <div class="card"><h3>Acceso, exclusiones y retención</h3>${tabla([{ t: 'Aspecto', k: 'aspecto' }, { t: 'Medida', k: 'medida' }], G.acceso)}</div>
  </div>
  <h3>Contrato de datos</h3><div class="card">${tabla([{ t: 'Tabla', k: 'tabla' }, { t: 'Granularidad', k: 'granularidad' }, { t: 'Clave', k: 'clave' }, { t: 'Reglas de contenido', k: 'reglas de contenido' }, { t: 'Verificación', k: 'verificación' }], G.contrato)}</div>
  <h3>Linaje: de dónde sale cada cifra</h3><div class="card">${tabla([{ t: 'Origen', k: 'origen' }, { t: 'Transformación', k: 'transformación' }, { t: 'Resultado', k: 'resultado' }, { t: 'Consumidor', k: 'consumidor' }], G.linaje)}</div>
  <h3>Auditoría del modelo por subgrupos</h3>
  <div class="card">
    <div class="ctl"><label>Conjunto<select id="g-aud"><option value="prueba">Prueba (n = ${G.auditoria_prueba.filter((r) => r.variable === 'sede').reduce((a, r) => a + r.n, 0)})</option><option value="pool">Validación + prueba (orientativo)</option></select></label></div>
    <div id="g-tab"></div>
    <div class="note">Una fila se marca <b>limitada</b> si tiene menos de 30 clientes o menos de 10 abandonos/permanencias: su cifra no se interpreta. La conclusión honesta con este volumen es "no se detecta una brecha concluyente", <b>no</b> "el modelo no tiene sesgo". Sede y canal se auditan; no se usan para negar beneficios.</div>
  </div>
  <h3>Explicabilidad (SHAP)</h3>
  <div class="grid g2">
    <div class="card"><img class="fig" src="img/fig_shap_beeswarm.png" alt="Resumen SHAP"><p class="lead" style="font-size:13px">Cada punto es un cliente de prueba; el color es el valor de la variable y la posición, su contribución al riesgo.</p></div>
    <div class="card">${tabla([{ t: 'Variable', k: 'variable' }, { t: 'Importancia (|SHAP| medio)', k: 'mean|SHAP|', n: true, f: (v) => fmt.n(v, 3) }, { t: 'Relación con el riesgo', k: 'relación (correl. valor-SHAP)', f: (v) => (v == null ? '—' : v > 0.3 ? 'más valor → más riesgo' : v < -0.3 ? 'más valor → menos riesgo' : 'débil') }], G.shap.slice(0, 10))}
      <p class="lead" style="font-size:13px">Domina el ritmo de compra (intervalo medio, frecuencia reciente, recencia). SHAP explica el modelo, <b>no la causa</b> del abandono: una variable puede predecir bien sin ser palanca de intervención.</p></div>
  </div>
  <h3>Matriz normativa</h3>
  <div class="card">
    <div class="note">Insumo técnico, no opinión legal. Se separa lo verificado (número, título, fecha de publicación) de lo <b>pendiente de verificar</b> en el texto oficial por el Oficial de Datos Personales o asesoría legal. La app no afirma cumplimiento normativo.</div>
    ${tabla([{ t: 'Norma', k: 'norma' }, { t: 'Fuente oficial', k: 'fuente oficial', f: (v) => esc(v).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>') }, { t: '¿Aplica?', k: '¿aplica a Patitas Andinas?' }, { t: 'Medida en el proyecto', k: 'medida en el proyecto' }, { t: 'Pendiente', k: 'pendiente' }], G.normas)}
  </div>`;
  const pintar = (v) => { root.querySelector('#g-tab').innerHTML = aud(v === 'prueba' ? G.auditoria_prueba : G.auditoria_pool); };
  root.querySelector('#g-aud').onchange = (e) => pintar(e.target.value);
  pintar('prueba');
}
