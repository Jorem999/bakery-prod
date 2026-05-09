ESPECIFICACIÓN DE REGISTRO MANUAL DE PRODUCCIÓN

# 📘 ESPECIFICACIÓN DE REGISTRO MANUAL DE PRODUCCIÓN

## Panadería D’ La Nonna – Versión 1.0

---

# 1. Propósito

Este documento define de manera formal la estructura, nomenclatura y reglas de interpretación de la hoja manual de producción utilizada en la panadería.

Objetivos:

* Estandarizar la interpretación de los registros escritos a mano
* Permitir la digitalización (manual o mediante IA)
* Servir como base para el sistema informático de producción
* Reducir ambigüedades y errores de interpretación

---

# 2. Estructura general de la hoja

Cada línea de la hoja representa un producto con su producción planificada y real.

## Formato general de línea

```
[CANTIDAD BASE] [PRODUCTO] [VARIANTES] → [SOLICITUD TOTAL] → [PRODUCCIÓN REAL]
```

---

# 3. Componentes de una línea

## 3.1 Cantidad base

Número entero que representa la cantidad de unidades completas del producto.

Ejemplo:

```
6 Negras
```

---

## 3.2 Nombre del producto

Identifica el tipo de pan.

Ejemplos:

* Campesino
* Baguette
* Negras
* Orégano
* Tocino
* Bollitos

---

## 3.3 Variantes

### 3.3.1 Pequeños (p)

Representa unidades pequeñas del producto.

Ejemplo:

```
12p
```

⚠️ Importante:
El valor de conversión depende del producto.

#### Equivalencias conocidas:

* Baguette: 3p = 1 unidad
* Negras: 6p = 1 unidad
* Orégano: 6p = 1 unidad
* Campesino (panecook): 3p = 1 unidad

---

### 3.3.2 Medios (1/2)

Representa media unidad del producto.

Ejemplo:

```
(1/2)
```

Se interpreta como:

* 0.5 unidades del producto base

---

### 3.3.3 Producción adicional (correcciones)

Ejemplo:

```
-3
```

Interpretación:

* Error de escritura → debe leerse como `+3`

---

### 3.3.4 Producción derivada (caso bollitos)

Ejemplo:

```
+(2x500)
```

Significa:

* Se producen productos adicionales (ej: moldes de 500g)
* Derivados de la misma masa

(12*90) 

Significa:

* otro derivado del Bollito, en este caso es una palaqueta de tipo Brioche

* estos productos derivados se registran en la línea inmediatamente debajo del Bollito y tienen un proceso adicional que modifica la masa agregándole mentequilla y azucar 

---

# 4. Solicitud de producción (lado derecho - círculo)

Los números encerrados en un círculo representan:

👉 **Cantidad total de masa a preparar**

Es el valor utilizado por el panadero para:

* pesar ingredientes
* preparar la masa

---

# 5. Producción real (lado derecho)

Después de la solicitud aparecen los resultados reales:

Ejemplo:

```
6 → 6
12p → 13p
```

Interpretación:

* Se produjo más o menos de lo solicitado
* Se debe registrar lo realmente obtenido

---

# 6. Reglas de negocio

## 6.1 Prioridad de datos

👉 La producción real es más importante que la solicitada

---

## 6.2 Variabilidad del proceso

Puede haber diferencias debido a:

* hidratación
* manipulación de masa
* rendimiento real

---

## 6.3 Producción compartida

Algunos productos comparten masa:

Ejemplo:

* Orégano y Tocino

Proceso:

* Se produce una sola masa
* Se divide posteriormente con rellenos

---

## 6.4 Incremento por proceso

Algunos productos generan más unidades:

Ejemplo:

* Baguette → aumenta por hidratación

---

## 6.5 Producción no diaria

Algunos productos:

* no se producen diariamente
* se congelan

Ejemplos:

* Integrales
* Dulces
* Focaccia

---

# 7. Productos derivados y extras

## 7.1 Moldes y Brioche (bollitos)

* Derivados de masa de bollitos
* Estos productos se encuentra en la línea de abajo del Bollito
* Tamaños: 
* 500g para el molde
* 90gr para la palanqueta Brioche

---

## 7.2 Productos especiales

* Focaccia
* Postres
* Panes personalizados

👉 Deben registrarse como productos independientes en el sistema

---

# 8. Conversión a sistema digital

Cada línea debe transformarse en:

## Estructura digital

* Producto
* Cantidad producida (unidades reales)
* Fecha (ProductionDay)
* Tipo de unidad (completa, media, pequeña)

---

## Regla clave

👉 Cada variante (ej: mini, medio, etc.) se convierte en un **producto independiente**

Ejemplo:

* Campesino
* Medio campesino
* Mini campesino (panecook)

---

# 9. Ejemplo completo interpretado

Entrada manual:

```
6 Negras 12p (○6) → 6 y 13p
```

Interpretación:

* Solicitud:

  * 6 unidades completas
  * 12 pequeñas
* Producción real:

  * 6 completas
  * 13 pequeñas

Salida digital:

* Producto: Negra → 6
* Producto: Mini negra → 13

---

# 10. Consideraciones para automatización (IA)

Para digitalización con cámara:

El sistema debe:

* detectar texto manuscrito
* interpretar símbolos (p, 1/2, +, etc.)
* aplicar reglas por producto
* validar contra estructura esperada

---

# 11. Limitaciones actuales

* Variabilidad en escritura manual
* Símbolos ambiguos
* Correcciones humanas
* Dependencia de contexto

---

# 12. Conclusión

Esta hoja manual contiene:

✔ Información completa de producción
✔ Reglas implícitas complejas
✔ Conocimiento operativo del panadero

Este documento formaliza ese conocimiento y permite:

👉 Digitalización
👉 Automatización
👉 Análisis futuro

---

# 13. Uso recomendado

Este documento debe utilizarse como:

* Referencia para desarrollo de software
* Guía para captura de datos
* Base para entrenamiento de modelos de IA
* Estándar interno de interpretación

---
