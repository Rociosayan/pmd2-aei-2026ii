# Evaluación del asistente

Complete `plantilla_evaluacion_asistente.csv` con **al menos 20 preguntas fijas**: 12 respondibles y 8 de abstención, ambigüedad, acceso no permitido o instrucciones adversarias.

- `tipo`: respondible, abstencion, ambigua, acceso_no_permitido o adversaria.
- `respuesta_esperada` y `fuente_o_tabla`: la respuesta correcta y el documento (con versión) o la tabla que la sustenta.
- `acierto`: 1 si la respuesta es correcta; en text-to-SQL se evalúa el resultado, no la igualdad literal del SQL.
- `afirmaciones_no_sustentadas`: número de afirmaciones que no están en la fuente.
- `latencia_s` y `coste_usd`: regístrelos si están disponibles.

Compare siempre con una consulta o recuperación determinista. Si no tiene acceso a un LLM, presente el prototipo y declare que las pruebas con el modelo están pendientes; no presente respuestas preparadas como resultados.
