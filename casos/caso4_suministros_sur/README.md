# Suministros Sur

Distribución B2B para restaurantes y pequeños hoteles. Este es el material de datos del caso del Proyecto Integrador 2 de Analítica Empresarial Integrada (TECSUP, 2026-II). La situación empresarial, la decisión que debe defender el equipo, los presupuestos y las preguntas de sustentación están en el documento de los cinco casos.

## Población, abandono y horizonte
- **Población elegible:** cuentas con al menos 2 pedidos entregados en los 120 días previos al corte (`fecha_entrega`).
- **Abandono (`churn`):** 1 si la cuenta no recibe ningún pedido entregado en los 60 días siguientes al corte. `definicion_etiqueta = sin_pedido_entregado_60d`.
- **Cortes:** primer domingo de cada mes, de 2023-07-02 a 2026-11-01. El corte del 2026-11-01 es la cartera para decidir: su etiqueta aún no existe.
- **Plan operativo:** del 2 al 29 de noviembre de 2026, en cuatro bloques de siete días.

## Qué contiene cada tabla
- `actividad`: una fila por línea de pedido (`pedido`) y las notas de crédito (`nota_credito`). `estado` puede ser entregado, en_ruta, cancelado_sin_stock o cancelado_cliente.
- `demanda`: unidades por semana, zona y familia de insumo. `faltante` es demanda no atendida por falta de stock.
- `operaciones`: `tiempo_entrega_h` (horas por pedido) y `nota_credito` (soles).
- `recursos`: stock, coste, margen y peso por familia, límites de presupuesto, carga y reparto, reserva por zona y parámetros de retención. Lea la columna `nota`.
- `politica_actual`: reglas con las que se reconstruye el escenario actual.
- `documentos`: crédito, devoluciones y notas de crédito, entregas (dos versiones) y prioridades de servicio por zona.

## Cuidados
- Facturación no es margen: use `recursos.margen`.
- Los contactos comerciales están seudonimizados; no hay nombres ni teléfonos.
- Una entrega tardía no prueba por sí sola la causa de la inactividad.

## Reglas comunes de preparación
- **Claves y relaciones:** `id_cliente` es único en `clientes`; todas las demás tablas se relacionan con él. Compruebe unicidad, integridad, fechas posteriores al alta, estados y unidades válidos y totales conciliados antes de modelar.
- **Separación temporal:** use los cortes de `cohortes` ordenados cronológicamente: entrenamiento hasta abril de 2026, validación en mayo y prueba en junio. Asigne los **clientes** a conjuntos disjuntos. El corte del 2026-11-01 sirve para decidir, no para escoger modelos ni umbrales.
- **Predictores:** calcule cada predictor solo con eventos hasta la fecha de corte. Excluya las etiquetas cuyo `seguimiento_fin` sea posterior a 2026-11-01.
- **Demanda:** reserve las cuatro últimas semanas como prueba final y haga al menos tres ventanas de validación de cuatro semanas dentro del periodo anterior. Compare todos los métodos con las mismas semanas y series.
- **Unidades:** los importes están en soles (S/). Las capacidades y los efectos incrementales de `recursos` son supuestos del enunciado.

## Diccionario
Vea `diccionario_datos.csv` en esta carpeta.
