"""Esqueleto de la app de Streamlit. Reemplace las secciones por el producto de su equipo."""
from pathlib import Path

import pandas as pd
import streamlit as st

RAIZ = Path(__file__).resolve().parent.parent / "casos"
CASOS = sorted(p.name for p in RAIZ.iterdir() if p.is_dir())

st.set_page_config(page_title="PMD2 · Analítica Empresarial Integrada", layout="wide")
caso = st.sidebar.selectbox("Caso", CASOS)


@st.cache_data
def leer(caso, tabla):
    return pd.read_csv(RAIZ / caso / "data" / f"{tabla}.csv")


st.title(f"Producto analítico · {caso}")
st.caption("Fecha de actualización de los datos: 2026-11-01. Importes en soles (S/). Los supuestos del enunciado deben mostrarse en la app.")

tab_riesgo, tab_demanda, tab_asignacion, tab_alertas, tab_asistente = st.tabs(
    ["Riesgo de abandono", "Demanda", "Asignación", "Alertas", "Asistente"])

with tab_demanda:
    demanda = leer(caso, "demanda")
    linea = st.multiselect("Línea", sorted(demanda.linea.unique()), default=list(sorted(demanda.linea.unique()))[:2])
    vista = demanda[demanda.linea.isin(linea)].groupby("semana")[["solicitado", "atendido"]].sum()
    st.line_chart(vista)

with tab_riesgo:
    st.info("Conecte aquí el modelo de abandono, el umbral económico y el número de contactos.")
with tab_asignacion:
    st.info("Conecte aquí la solución de PuLP, el presupuesto seleccionable y la comparación con la política actual.")
with tab_alertas:
    st.info("Conecte aquí la carta de control, las anomalías y el responsable de cada alerta.")
with tab_asistente:
    st.info("Conecte aquí el asistente (text-to-SQL o RAG) y la evaluación fija de preguntas. No guarde claves en el repositorio: use st.secrets.")
