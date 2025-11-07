# Calculadora Renting vs Compra (DCF) v1.3.1

Aplicación web que evalúa, compara y visualiza el coste total y el **Coste Presente Neto (CPN)** de **comprar vs alquilar (renting)** un vehículo, con:
- ✅ Flujos de caja descontados (DCF) **mensuales**
- ✅ Ajustes de inflación y coste del dinero
- ✅ Penalizaciones por km excedidos
- ✅ Planificación semanal dinámica de uso

## 🚀 Uso Rápido

Simplemente abre `index.html` en tu navegador web. No requiere instalación ni servidor.

Para desarrollo local con servidor:
```bash
python3 -m http.server 8000
# Abre http://localhost:8000
```

## 📋 Características

### Entrada de Datos
- **Parámetros Financieros**: duración (meses), tasa de descuento, inflación, IVA
- **Opción Compra**: precio, costes fijos anuales, valor residual
- **Contratos Renting**: define múltiples contratos personalizados (cuota, km/año incluidos, penalización) con presets de 10k y 15k km/año
- **Combustible**: coste por km con ajuste de inflación
- **Planificación Semanal**: define viajes diarios (ej: Lunes 1 viaje × 20 km)
- **Viajes Puntuales**: vacaciones, viajes largos ocasionales
- **Modificadores**: semanas sin uso, períodos con uso reducido

### Análisis
1. **Resumen**: CPN de cada opción, recomendación automática, gráficos comparativos
2. **Equilibrio**: punto de equilibrio (meses) donde CPN son equivalentes
3. **Malla**: heatmap de diferencias CPN en matriz meses × km/año
4. **Detalles**: tabla mes a mes de flujos de caja y valores presentes

### Visualizaciones
- Barras de CPN por opción
- Líneas de costes anuales
- Barras de km semanales por día
- Curva de equilibrio
- Heatmap de sensibilidad

### Exportación
- CSV (para Excel/Sheets)
- JSON (para respaldo/análisis)

## 📐 Modelo Matemático

### Conversión de Tasas
```javascript
tasa_mensual = (1 + tasa_anual)^(1/12) - 1
```

### Km Anuales
```javascript
km_semana = Σ(días) Σ(viajes × km_por_viaje)
km_año = km_semana × (52 - semanas_libres) 
         + ajustes_períodos_custom 
         + viajes_puntuales
```

### Coste Presente Neto (CPN)
El CPN es el valor presente de todos los costes futuros, mostrado como valor positivo para facilitar la comparación. A menor CPN, más económica es la opción.

```javascript
CPN = |Σ(flujo_caja_mes / (1 + tasa_descuento_mensual)^mes)|
```

### Flujos de Caja - Compra
- **Mes 0**: -precio_compra
- **Meses 1-N**: -(combustible + mantenimiento) con inflación
- **Mes N**: +valor_residual (interpolado)

### Flujos de Caja - Renting
- **Meses 1-N**: -(cuota_fija_con_IVA + combustible) con inflación en combustible
- **Mes N**: -penalización si km_totales > km_permitidos

## 🧮 Ejemplo por Defecto

Con **10.002 km/año** durante **72 meses**:

| Opción | CPN | Penalización | Resultado |
|--------|-----|--------------|-----------|
| **Compra** | 37.277 € | - | |
| **Renting 10k** | 32.043 € | 0 € | |
| **Renting 15k** | 33.558 € | 0 € | ✅ **ÓPTIMO** |

**Ahorro con Renting**: 3.719 € → Renting 15k es más económico  
**Punto de equilibrio**: ~97 meses (8.1 años)

## 💾 Persistencia

Los datos se guardan automáticamente en `localStorage` y se restauran al recargar la página.

## 🔒 Seguridad

- ✅ Sin dependencias externas
- ✅ Solo cliente (sin servidor)
- ✅ Sin datos sensibles
- ✅ Sin vulnerabilidades (CodeQL verificado)

## 📄 Licencia

Este proyecto está disponible como código abierto.

## 🤝 Contribuciones

Mejoras bienvenidas vía pull requests.

## 📞 Soporte

Para issues o preguntas, usa GitHub Issues.
