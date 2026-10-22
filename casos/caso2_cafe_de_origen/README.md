# Café de Origen

Suscripciones de café y venta directa. Este es el material de datos del caso del Proyecto Integrador 2 de Analítica Empresarial Integrada (TECSUP, 2026-II). La situación empresarial, la decisión que debe defender el equipo, los presupuestos y las preguntas de sustentación están en el documento de los cinco casos.

## Población, abandono y horizonte
- **Población elegible:** suscriptores activos al corte con al menos 60 días de antigüedad. Los suscriptores en pausa siguen siendo elegibles; la columna `en_pausa` los identifica y el equipo debe documentar cómo los trata.
- **Abandono (`churn`):** 1 si la cancelación se hace efectiva dentro de los 30 días siguientes al corte. Una pausa no es una cancelación. `definicion_etiqueta = cancelacion_efectiva_30d`.
- **Ciclos:** cada suscripción factura en ciclos de 30 días desde la fecha de alta.
- **Cortes:** primer domingo de cada mes, de 2023-07-02 a 2026-11-01. El corte del 2026-11-01 es la cartera para decidir: su etiqueta aún no existe.
- **Plan operativo:** del 2 al 29 de noviembre de 2026, en cuatro bloques de siete días.

## Qué contiene cada tabla
- `actividad`: `envio_suscripcion`, `compra_adicional`, `pausa`, `cancelacion`, `valoracion` e `incidencia`. Las bolsas de suscripción y las adicionales no deben sumarse dos veces.
- `demanda`: bolsas por semana, zona de despacho y línea, con `solicitado_suscripcion` y `solicitado_adicional`. `faltante` registra compras adicionales sin stock.
- `operaciones`: `peso_media_g` y `peso_rango_g` por lote (muestra constante de 5 bolsas) y `cobro` por cada envío o compra.
- `recursos`: consumo de café verde, horas de tostado, empaque y costes por línea, más los límites del plan y de la retención. Lea la columna `nota`.
- `politica_actual`: reglas con las que se reconstruye el escenario actual.
- `documentos`: condiciones de suscripción, pausas y cancelaciones (dos versiones), especificaciones de empaque e incidencias.

## Cuidados
- Los límites de una carta de control no son especificaciones de tolerancia.
- Un cliente sin `consentimiento_contacto` no puede ser contactado.

## Reglas comunes de preparación
- **Claves y relaciones:** `id_cliente` es único en `clientes`; todas las demás tablas se relacionan con él. Compruebe unicidad, integridad, fechas posteriores al alta, estados y unidades válidos y totales conciliados antes de modelar.
- **Separación temporal:** use los cortes de `cohortes` ordenados cronológicamente: entrenamiento hasta abril de 2026, validación en mayo y prueba en junio. Asigne los **clientes** a conjuntos disjuntos. El corte del 2026-11-01 sirve para decidir, no para escoger modelos ni umbrales.
- **Predictores:** calcule cada predictor solo con eventos hasta la fecha de corte. Excluya las etiquetas cuyo `seguimiento_fin` sea posterior a 2026-11-01.
- **Demanda:** reserve las cuatro últimas semanas como prueba final y haga al menos tres ventanas de validación de cuatro semanas dentro del periodo anterior. Compare todos los métodos con las mismas semanas y series.
- **Unidades:** los importes están en soles (S/). Las capacidades y los efectos incrementales de `recursos` son supuestos del enunciado.

## Diccionario
Vea `diccionario_datos.csv` en esta carpeta.
