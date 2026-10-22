# AndeHogar

Comercio electrónico de productos para el hogar. Este es el material de datos del caso del Proyecto Integrador 2 de Analítica Empresarial Integrada (TECSUP, 2026-II). La situación empresarial, la decisión que debe defender el equipo, los presupuestos y las preguntas de sustentación están en el documento de los cinco casos.

## Población, abandono y horizonte
- **Población elegible:** compradores con al menos 2 pedidos entregados en los 180 días previos al corte (`fecha_entrega`).
- **Abandono (`churn`):** 1 si el cliente no recibe ningún pedido entregado en los 60 días siguientes al corte. Es inactividad de compradores recurrentes, no cancelación contractual. `definicion_etiqueta = sin_pedido_entregado_60d`.
- **Cortes:** primer domingo de cada mes, de 2023-07-02 a 2026-11-01. El corte del 2026-11-01 es la cartera para decidir: su etiqueta aún no existe.
- **Plan operativo:** del 2 al 29 de noviembre de 2026, en cuatro bloques de siete días.

## Qué contiene cada tabla
- `actividad`: una fila por línea de pedido (`tipo_evento = pedido`) y las devoluciones (`devolucion`). `estado` puede ser entregado, en_ruta, cancelado_sin_stock o cancelado_cliente. Las entregas posteriores al corte aparecen como `en_ruta`.
- `demanda`: unidades por semana, ciudad y familia. `solicitado` no incluye lo cancelado por el cliente; `faltante` es demanda no atendida por falta de stock.
- `operaciones`: `preparacion_pedido` (minutos por pedido) y `reembolso` (soles por devolución).
- `recursos`: stock, coste, margen y espacio por familia, más los límites del plan de compra y de la campaña. Lea la columna `nota`.
- `politica_actual`: reglas con las que se reconstruye el escenario actual.
- `documentos`: política de devoluciones (dos versiones), niveles de servicio, descuentos y contacto con clientes.

## Cuidados
- Un pedido entregado después del corte no es un predictor disponible en ese corte.
- No interprete las ventas atendidas como demanda completa: hay faltantes por stock.
- Un cliente sin `consentimiento_contacto` no puede incluirse en la campaña.

## Reglas comunes de preparación
- **Claves y relaciones:** `id_cliente` es único en `clientes`; todas las demás tablas se relacionan con él. Compruebe unicidad, integridad, fechas posteriores al alta, estados y unidades válidos y totales conciliados antes de modelar.
- **Separación temporal:** use los cortes de `cohortes` ordenados cronológicamente: entrenamiento hasta abril de 2026, validación en mayo y prueba en junio. Asigne los **clientes** a conjuntos disjuntos. El corte del 2026-11-01 sirve para decidir, no para escoger modelos ni umbrales.
- **Predictores:** calcule cada predictor solo con eventos hasta la fecha de corte. Excluya las etiquetas cuyo `seguimiento_fin` sea posterior a 2026-11-01.
- **Demanda:** reserve las cuatro últimas semanas como prueba final y haga al menos tres ventanas de validación de cuatro semanas dentro del periodo anterior. Compare todos los métodos con las mismas semanas y series.
- **Unidades:** los importes están en soles (S/). Las capacidades y los efectos incrementales de `recursos` son supuestos del enunciado.

## Diccionario
Vea `diccionario_datos.csv` en esta carpeta.
