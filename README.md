# Proyecto Integrador 2 · Analítica Empresarial Integrada

TECSUP · Big Data y Ciencia de Datos · 2026-II · Docente: Pilar Rocío Sayán Mejía

Repositorio con los datos de los cinco casos del PMD2. Cada grupo trabaja **solo** en la carpeta de su caso:

| Grupo | Caso | Carpeta |
|---|---|---|
| 1 | AndeHogar | `casos/caso1_andehogar` |
| 2 | Café de Origen | `casos/caso2_cafe_de_origen` |
| 3 | VitalFit | `casos/caso3_vitalfit` |
| 4 | Suministros Sur | `casos/caso4_suministros_sur` |
| 5 | AulaActiva | `casos/caso5_aulaactiva` |

Además hay un **caso ejemplo resuelto** (`casos/ejemplo_patitas_andinas`: datos, Colab ejecutado y app web) para ver cómo se conectan las semanas 9 a 15. No lo desarrolla ningún grupo y copiarlo no cumple la rúbrica.

El enunciado completo (situación, decisión, presupuestos y preguntas de sustentación) está en el documento de los cinco casos, y la rúbrica en el documento de la rúbrica.

## Cómo empezar
1. Un integrante hace **Fork** de este repositorio a su cuenta de GitHub y agrega a los demás como colaboradores.
2. Abra `casos/<su caso>/notebooks/00_inicio.ipynb` en Google Colab (File → Open notebook → GitHub), complete `USUARIO` y `GRUPO`, y ejecútelo.
3. Los datos se leen directamente desde GitHub con la URL *raw* (su fork debe ser público); no necesita descargar archivos.
4. Cada integrante trabaja con su propia cuenta: los *commits* de cada uno son evidencia de su aporte en la sustentación.

## Estructura
```
casos/<caso>/data/          tablas del caso (CSV, UTF-8)
casos/<caso>/notebooks/     cuaderno de inicio y sus cuadernos de trabajo
casos/<caso>/README.md      definiciones del caso
casos/<caso>/diccionario_datos.csv
app/app.py                  esqueleto de la app de Streamlit
plantillas/                 plantilla de evaluación del asistente
requirements.txt
```

## Reglas
- No suba claves de API, contraseñas ni datos personales. Use `st.secrets` o variables de entorno; `.gitignore` ya excluye `.env` y `secrets.toml`.
- Los datos no se modifican en la carpeta `data/`. Las tablas derivadas van en otra carpeta.
- Todo resultado del informe debe poder rastrearse a una celda del Colab y coincidir con la app para la misma entrada.
- Declare qué parte del trabajo se apoyó en IA generativa y qué verificó usted mismo.

## Entregables (Semana 16)
Colab ejecutado y reproducible, repositorio con instrucciones de ejecución, informe gerencial sin código, enlace de la app de Streamlit desplegada y demostración en vivo. El checkpoint de la Semana 14 integra las semanas 9 a 14.

## Desplegar la app
En [share.streamlit.io](https://share.streamlit.io) elija este repositorio, la rama `main` y el archivo `app/app.py`. Las claves se cargan en *Secrets*, nunca en el código.

## Entorno
Python 3.10 o superior. En Colab: `!pip install -r requirements.txt`. Se fija `pulp<4` porque PuLP 4 cambió su interfaz; con `pulp<4` el solver CBC viene incluido.
