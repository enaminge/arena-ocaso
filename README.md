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

En pantallas táctiles aparecen botones en pantalla.

## Cómo funciona

- CENTINELA patrulla la arena, te busca cuando te pierde de vista y mejora su puntería, cadencia y velocidad en cada ronda.
- Sus proyectiles son lentos y se pueden esquivar; los bloques de hormigón sirven de cobertura.
- Todo el juego está en un solo archivo: escena, IA, efectos, sonido sintetizado con Web Audio y la cara del enemigo dibujada en un canvas.
