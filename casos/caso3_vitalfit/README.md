# VitalFit

Membresías y clases de gimnasio. Este es el material de datos del caso del Proyecto Integrador 2 de Analítica Empresarial Integrada (TECSUP, 2026-II). La situación empresarial, la decisión que debe defender el equipo, los presupuestos y las preguntas de sustentación están en el documento de los cinco casos.

## Población, abandono y horizonte
- **Población elegible:** socios activos al corte con al menos 30 días de antigüedad y sin pago vencido pendiente.
- **Abandono (`churn`):** 1 si el socio no renueva dentro de los 30 días posteriores al vencimiento que sigue al corte (`fecha_vencimiento`). Un pago tardío dentro de ese plazo no es abandono. `definicion_etiqueta = sin_renovacion_30d_tras_vencimiento`.
- **Seguimiento:** `seguimiento_fin` = vencimiento + 30 días. Excluya las filas cuyo seguimiento termina después de 2026-11-01.
- **Cortes:** primer domingo de cada mes, de 2023-07-02 a 2026-11-01. El corte del 2026-11-01 es la cartera para decidir.
- **Plan operativo:** del 2 al 29 de noviembre de 2026, en cuatro bloques de siete días.

## Qué contiene cada tabla
- `actividad`: `reserva_clase` (estados asistida, inasistencia, cancelada, lista_espera), `alta`, `renovacion`, `baja` e `incidencia`.
- `demanda`: reservas por semana, sede y franja horaria. `solicitado` excluye las cancelaciones del socio; `faltante` son reservas en lista de espera. Las asistencias observadas no son la demanda total.
- `operaciones`: `inasistencia_dia` (inasistencias y reservas confirmadas por sede y día) y `ocupacion_franja` (porcentaje semanal con la capacidad en `denominador`).
- `recursos`: horas de instructor, sesiones, salas, cupos y costes, más los límites de la retención. Lea la columna `nota`.
- `politica_actual`: reglas y horario del mes anterior (sesiones de cuatro semanas por sede y franja).
- `documentos`: reglas de renovación (dos versiones), reservas, uso de salas y protocolo de revisión humana.

## Cuidados
- No hay datos de salud ni biometría, y no deben inferirse.
- Una baja asistencia no demuestra la causa de un abandono.

## Reglas comunes de preparación
- **Claves y relaciones:** `id_cliente` es único en `clientes`; todas las demás tablas se relacionan con él. Compruebe unicidad, integridad, fechas posteriores al alta, estados y unidades válidos y totales conciliados antes de modelar.
- **Separación temporal:** use los cortes de `cohortes` ordenados cronológicamente: entrenamiento hasta abril de 2026, validación en mayo y prueba en junio. Asigne los **clientes** a conjuntos disjuntos. El corte del 2026-11-01 sirve para decidir, no para escoger modelos ni umbrales.
- **Predictores:** calcule cada predictor solo con eventos hasta la fecha de corte. Excluya las etiquetas cuyo `seguimiento_fin` sea posterior a 2026-11-01.
- **Demanda:** reserve las cuatro últimas semanas como prueba final y haga al menos tres ventanas de validación de cuatro semanas dentro del periodo anterior. Compare todos los métodos con las mismas semanas y series.
- **Unidades:** los importes están en soles (S/). Las capacidades y los efectos incrementales de `recursos` son supuestos del enunciado.

## Diccionario
Vea `diccionario_datos.csv` en esta carpeta.
