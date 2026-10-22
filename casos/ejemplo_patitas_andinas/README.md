# Patitas Andinas · caso ejemplo resuelto

Comercio electrónico de alimento y accesorios para mascotas (Lima, Trujillo y Piura). Es el **caso de referencia** del Proyecto Integrador 2 de Analítica Empresarial Integrada (TECSUP, 2026-II): no lo desarrolla ningún grupo; sirve para ver cómo se conectan las semanas 9 a 15 y qué evidencia espera la rúbrica. El enunciado completo está en `PMD2_AEI_Caso_Ejemplo_2026II.docx`. **Copiar este cuaderno no cumple la rúbrica**: cada equipo debe trabajar su propio caso, con sus definiciones y con palabras propias.

## Qué hay en esta carpeta
| Ruta | Contenido |
|---|---|
| `data/` | Las 8 tablas del contrato de datos (CSV UTF-8) y `../diccionario_datos.csv` |
| `notebooks/00_inicio.ipynb` | Cuaderno de inicio con los controles de recepción (el mismo de los otros casos) |
| `notebooks/EJEMPLO_PMD2_Patitas_Andinas.ipynb` | **Colab resuelto, ya ejecutado**: SQL (DuckDB), churn, pronóstico, PuLP, cartas de control, SHAP, auditoría, asistente text-to-SQL y exportación |
| `salidas/` | Tablas, figuras, evaluación del asistente y `paquete_app.json` que alimentan la app |
| `web/` | Aplicación web estática (lista para Vercel) que reproduce las cifras del Colab |

## Definiciones del caso
- **Población:** compradores con al menos 2 pedidos entregados en los 180 días previos al corte (`fecha_entrega`).
- **Abandono (`churn`):** 1 si no reciben ningún pedido entregado en los 60 días siguientes. `definicion_etiqueta = sin_pedido_entregado_60d`.
- **Cortes:** primer domingo de cada mes, de 2023-07-02 a 2026-11-01. El corte del 2026-11-01 es la cartera para decidir; su etiqueta no existe.
- **Demanda:** unidades **solicitadas** por semana, sede y familia (200 semanas). `faltante` = demanda no atendida por falta de stock.
- **Plan operativo:** del 2 al 29 de noviembre de 2026, en cuatro bloques de siete días.
- `recursos`: stock, coste y margen por familia; presupuestos de compra y de campaña; almacenamiento; despachos; costes de contacto; cobertura mínima y los **efectos incrementales supuestos** (0, 0,08 y 0,15). Lea la columna `nota`.
- `documentos`: devoluciones, niveles de servicio, descuentos, contacto y programa de recompra, con versión vigente y versión reemplazada.

## Cómo ejecutar el Colab
1. Abra `notebooks/EJEMPLO_PMD2_Patitas_Andinas.ipynb` en Google Colab (File → Open notebook → GitHub) o en Jupyter local.
2. Complete `USUARIO` si lo ejecuta desde su fork (en local usa la carpeta `../data`).
3. *Runtime → Run all*. Tarda unos minutos; las semillas están fijadas y dos ejecuciones dan las mismas cifras.
4. Opcional: para evaluar el motor LLM del asistente, guarde `ANTHROPIC_API_KEY` en los *Secrets* de Colab. **No** suba claves al repositorio; sin clave, el LLM se declara «no ejecutado».

## Cómo ver la app
```bash
cd web
python -m http.server 8000      # o cualquier servidor estático; abrirla con doble clic no funciona (fetch)
# abrir http://localhost:8000
node tests/test_logic.mjs       # concilia la app con las cifras del Colab (92 pruebas)
```
Para publicarla en Vercel vea `web/README.md`.

## Cuidados
- Datos **sintéticos** y seudonimizados: no hay nombres, documentos, teléfonos ni correos.
- Facturación no es margen: use `recursos.margen`.
- Un modelo de riesgo no estima el efecto causal del contacto: el efecto es un supuesto del enunciado.
- Las anomalías son señales para revisar, no prueba de fraude.
