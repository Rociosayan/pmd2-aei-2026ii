// Asistente text-to-SQL de solo lectura. Línea base determinista (reglas + plantillas SQL), igual que en el cuaderno, ejecutada sobre SQLite (sql.js).
// No usa ningún modelo de lenguaje: la evaluación del LLM queda pendiente y así se declara.

export const TABLAS_PERMITIDAS = new Set(['clientes', 'actividad', 'demanda', 'recursos', 'politica_actual', 'documentos']);
const sa = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function crearAsistente(db, ctx) {
  // ctx: {familias:[...], sedes:[...], last4:'YYYY-MM-DD', documentos:[{doc_id,version,estado,texto}]}
  const FAMS = Object.fromEntries(ctx.familias.map((f) => [sa(f), f]));
  const SEDES = Object.fromEntries(ctx.sedes.map((s) => [sa(s), s]));

  function validar(sql) {
    const s = sql.trim().replace(/;\s*$/, '');
    if (s.includes(';')) return [false, 'solo se permite una sentencia'];
    if (!/^(select|with)\b/i.test(s)) return [false, 'solo se permite una sentencia SELECT'];
    if (/\b(insert|update|delete|drop|alter|create|attach|pragma|replace|truncate)\b/i.test(s)) return [false, 'palabras reservadas de escritura no permitidas'];
    const bajo = sa(s);
    for (const m of bajo.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/g)) if (!TABLAS_PERMITIDAS.has(m[1])) return [false, `tabla no permitida: ${m[1]}`];
    const sinAgr = bajo.replace(/count\s*\(\s*distinct\s+id_cliente\s*\)/g, '');
    if (/\bid_cliente\b/.test(sinAgr) && !/\bgroup by\b/.test(sinAgr)) return [false, 'no se permiten datos individuales de clientes'];
    return [true, 'ok'];
  }

  function ejecutar(sql) {
    const [ok, motivo] = validar(sql);
    if (!ok) throw new Error(motivo);
    const r = db.exec(`select * from (${sql.trim().replace(/;\s*$/, '')}) limit 200`);
    return r.length ? { columns: r[0].columns, rows: r[0].values } : { columns: [], rows: [] };
  }

  function baseNl2Sql(pregunta) {
    const q = sa(pregunta);
    const fam = Object.entries(FAMS).find(([k]) => q.includes(k))?.[1];
    const anio = (q.match(/\b(20\d\d)\b/) || [])[1];
    if (/\b(drop|delete|update|insert|truncate|alter|create)\b|ignora|olvida|instrucciones anteriores|prompt/.test(q)) return { estado: 'rechaza', motivo: 'petición destructiva o intento de cambiar las reglas del asistente' };
    if (/telefono|correo|email|direccion|\bdni\b|nombre/.test(q)) return { estado: 'rechaza', motivo: 'datos personales no disponibles ni permitidos' };
    if (/id_cliente|lista (de )?(todos|cada)|todos los clientes con/.test(q)) return { estado: 'rechaza', motivo: 'solo se entregan resultados agregados, no datos individuales' };
    if (/mejor cliente|peor cliente/.test(q) || (/cuanto vendimos|cuanto se vendio/.test(q) && !anio && !q.includes('ultim'))) return { estado: 'aclara', motivo: 'la pregunta no define criterio, métrica o periodo' };
    if (/2027|proximo ano|futuro|cuantos clientes habra/.test(q)) return { estado: 'abstiene', motivo: 'los datos llegan hasta 2026-11-01; no hay evidencia sobre el futuro' };
    if (q.includes('cuantos clientes') && q.includes('consentimiento')) return { estado: 'responde', sql: 'select sum(consentimiento_contacto) as clientes_con_consentimiento from clientes' };
    if (q.includes('cuantos clientes') && q.includes('por sede')) return { estado: 'responde', sql: 'select sede, count(*) as clientes from clientes group by sede order by sede' };
    if (/cuantos clientes (tiene|hay|existen)/.test(q)) return { estado: 'responde', sql: 'select count(*) as clientes from clientes' };
    if (q.includes('demanda') && fam && anio) return { estado: 'responde', sql: `select sum(solicitado) as unidades_solicitadas from demanda where linea = '${fam}' and substr(cast(semana as varchar), 1, 4) = '${anio}'` };
    if (q.includes('familia') && q.includes('mas') && q.includes('ultimas 4 semanas')) return { estado: 'responde', sql: `select linea, sum(solicitado) as unidades from demanda where semana >= '${ctx.last4}' group by linea order by unidades desc limit 1` };
    if (q.includes('ingreso') && q.includes('por sede') && anio) return { estado: 'responde', sql: `select sede, round(sum(ingreso), 2) as ingreso from actividad where tipo_evento = 'pedido' and substr(cast(fecha_evento as varchar), 1, 4) = '${anio}' group by sede order by sede` };
    if (q.includes('pedidos entregados') && q.includes('octubre') && anio) return { estado: 'responde', sql: `select count(distinct id_pedido) as pedidos from actividad where tipo_evento = 'pedido' and estado = 'entregado' and substr(cast(fecha_evento as varchar), 1, 7) = '${anio}-10'` };
    if (q.includes('devoluciones') && anio) return { estado: 'responde', sql: `select count(*) as devoluciones from actividad where tipo_evento = 'devolucion' and substr(cast(fecha_evento as varchar), 1, 4) = '${anio}'` };
    if (q.includes('presupuesto de compra')) return { estado: 'responde', sql: "select limite as presupuesto_compra_soles from recursos where recurso = 'presupuesto_compra'" };
    if (q.includes('stock') && fam) return { estado: 'responde', sql: `select disponibilidad as stock_inicial from recursos where recurso = 'inventario' and linea = '${fam}'` };
    if (/devol/.test(q) && /plazo|dias/.test(q)) return { estado: 'responde', sql: "select doc_id, version, texto from documentos where doc_id = 'PA-DOC-01' and estado = 'vigente'", cita: true };
    if (/meta de servicio|preparar un pedido/.test(q)) return { estado: 'responde', sql: "select doc_id, version, texto from documentos where doc_id = 'PA-DOC-02' and estado = 'vigente'", cita: true };
    const stop = new Set(['ofrecen', 'tienen', 'cuanto', 'cuales', 'puede', 'hacen', 'empresa']);
    const palabras = (q.match(/[a-z]{5,}/g) || []).filter((w) => !stop.has(w));
    const hits = ctx.documentos.filter((d) => d.estado === 'vigente' && palabras.some((w) => sa(d.texto).includes(w)));
    if (!hits.length) return { estado: 'abstiene', motivo: 'no hay evidencia en las tablas ni en los documentos vigentes' };
    return { estado: 'aclara', motivo: 'hay documentos relacionados pero la pregunta no coincide con una consulta definida' };
  }

  function responder(pregunta) {
    const t0 = performance.now();
    const r = baseNl2Sql(pregunta);
    const out = { pregunta, estado: r.estado, sql: r.sql || null, motivo: r.motivo || null, resultado: null, texto: null };
    if (r.estado === 'responde') {
      try {
        const res = ejecutar(r.sql); out.resultado = res;
        out.texto = r.cita ? `Según ${res.rows[0][0]} versión ${res.rows[0][1]} (vigente): ${res.rows[0][2]}`
          : res.rows.map((row) => res.columns.map((c, j) => `${c} = ${row[j]}`).join(', ')).join('; ');
      } catch (e) { out.estado = 'rechaza'; out.motivo = e.message; }
    }
    if (out.texto === null) out.texto = ({ rechaza: 'No puedo atender esta petición: ', abstiene: 'No tengo evidencia para responder: ', aclara: 'Necesito una aclaración: ' }[out.estado] || '') + (out.motivo || '');
    out.latencia_ms = performance.now() - t0;
    return out;
  }

  function evaluar(esp, r) {
    const txt = r.texto || '';
    if (esp.conducta) {
      let ok = r.estado === esp.conducta && r.resultado === null;
      if (ok && esp.no_afirma && esp.no_afirma.some((a) => txt.includes(a))) ok = false;
      return { ok, noSust: 0, obs: `conducta observada: ${r.estado}` };
    }
    if (r.estado !== 'responde' || !r.resultado) return { ok: false, noSust: 0, obs: `no respondió (${r.estado})` };
    const res = r.resultado;
    let ok;
    if ('escalar' in esp) ok = Math.abs(Number(res.rows[0][0]) - esp.escalar) < 1e-6;
    else if (esp.tabla) {
      const obs = Object.fromEntries(res.rows.map((row) => [String(row[0]), Number(row[1])]));
      ok = Object.keys(obs).length === Object.keys(esp.tabla).length && Object.entries(esp.tabla).every(([k, v]) => k in obs && Math.abs(obs[k] - Number(v)) < 0.011);
    } else ok = esp.texto_ok.every((s) => txt.includes(s));
    const ref = new Set((res.rows.flat().join(' ') + ' ' + r.pregunta).match(/\d+(?:[.,]\d+)?/g) || []);
    const tn = (n) => (n.includes('.') ? n.replace(/0+$/, '').replace(/\.$/, '') : n);
    const refN = new Set([...ref].map(tn).concat([...ref]));
    const noSust = [...new Set(txt.match(/\d+(?:[.,]\d+)?/g) || [])].filter((n) => !refN.has(n) && !refN.has(tn(n))).length;
    return { ok, noSust, obs: '' };
  }

  return { validar, ejecutar, responder, evaluar, baseNl2Sql };
}
