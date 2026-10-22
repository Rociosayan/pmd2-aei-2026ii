# Patitas Andinas · aplicación web del caso ejemplo

Página estática (HTML + JavaScript, sin servidor ni base de datos externa) que muestra el producto analítico del caso ejemplo del PMD2. Los modelos de ML se entrenan en el Colab; la página **vuelve a resolver** la optimización (HiGHS en WebAssembly), la carta de control, los umbrales y las consultas SQL (SQLite en el navegador) y **reproduce las cifras del Colab**. Ningún dato sale del navegador.

## Estructura
```
index.html          pestañas por semana: Resumen · Riesgo (S9) · Demanda (S10) · Optimización (S11) · Procesos (S12) · Gobierno (S13) · Asistente (S14) · Calidad (S15-16)
js/                 optimizer.js (modelo entero mixto), control.js (carta X̄, umbral), assistant.js (text-to-SQL), ui.js, views/*
data/               paquete_app.json y patitas.db: los escribe el Colab (carpeta ../salidas)
vendor/             Chart.js, HiGHS y sql.js (copias locales; no hay CDN)
tests/              test_logic.mjs: compara la app con el Colab
vercel.json         cabeceras y wasm
```

## Probar en local
```bash
python -m http.server 8000     # desde esta carpeta
node tests/test_logic.mjs      # 92 comprobaciones contra las cifras del Colab
```

## Publicar en Vercel
Opción A (navegador): vercel.com → *Add New… → Project* → importe el repositorio → *Root Directory* = `casos/ejemplo_patitas_andinas/web` → *Framework preset: Other* → *Deploy*.

Opción B (terminal):
```bash
npm i -g vercel
cd casos/ejemplo_patitas_andinas/web
vercel login
vercel --prod
```
No hace falta *build*: es contenido estático.

## Actualizar los datos de la app
Ejecute el Colab (genera `../salidas/paquete_app.json` y `../salidas/patitas.db`) y copie esos dos archivos y las imágenes `../salidas/*.png` a `data/` e `img/`. Luego ejecute `node tests/test_logic.mjs`: si todo concilia, publique.

## Qué cumple y qué no de la rúbrica
Esta página es el *producto de referencia*. La rúbrica pide Streamlit desplegado para los equipos; el equivalente de cada pestaña en Streamlit es una función que lee las mismas salidas del Colab. Lo que no cambia: filtros y escenarios, fecha de actualización, unidades y supuestos visibles, y cifras iguales a las del Colab.
