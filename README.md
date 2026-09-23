# Arena Ocaso

Juego de disparos en primera persona en 3D que corre en el navegador. Te enfrentas 1 contra 1 a CENTINELA, un jefe malvado con armadura de combate, en una arena al atardecer. Gana quien se lleve 3 rondas.

## Cómo jugar

Abre `index.html` en el navegador. No hace falta instalar nada; el motor 3D (three.js r128) se carga desde cdnjs.

| Tecla | Acción |
|---|---|
| ↑ / ↓ | Avanzar y retroceder |
| ← / → | Girar (mantén pulsado para girar más rápido) |
| Espacio | Disparar (recarga automática cada 12 tiros) |
| A / D | Moverte de lado |
| M | Silenciar |

En el celular aparecen flechas en pantalla a la izquierda (se puede deslizar el dedo entre ellas) y un botón FUEGO a la derecha. El juego pasa a pantalla completa y en horizontal al empezar.

## Instalar en Android

El juego es una app web instalable (PWA) publicada con GitHub Pages en https://enaminge.github.io/arena-ocaso/

1. Abre esa dirección en Chrome en el teléfono.
2. Toca **Instalar app** en el menú del juego, o en el menú de Chrome (⋮) elige **Instalar aplicación** / **Agregar a pantalla principal**.
3. Queda un ícono en el teléfono; se abre en pantalla completa, en horizontal, y funciona sin internet después de la primera visita.

## Cómo funciona

- CENTINELA patrulla la arena, te busca cuando te pierde de vista y mejora su puntería, cadencia y velocidad en cada ronda.
- Sus proyectiles son lentos y se pueden esquivar; los bloques de hormigón sirven de cobertura.
- Todo el juego está en un solo archivo: escena, IA, efectos, sonido sintetizado con Web Audio y la cara del enemigo dibujada en un canvas.
