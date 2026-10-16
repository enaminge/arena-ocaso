# Arena Ocaso

Juego de disparos en primera persona en 3D que corre en el navegador. Te enfrentas 1 contra 1 a CENTINELA, un jefe malvado con armadura de combate, en una arena al atardecer. Gana quien se lleve 3 rondas.

Se juega en https://enaminge.github.io/arena-ocaso/ desde PC, tablet, Android o iPhone.

## Dificultad

En el menú eliges cómo de difícil es CENTINELA. La opción queda guardada para la próxima vez.

| Nivel | Velocidad | Dispara cada | Daño por impacto |
|---|---|---|---|
| Fácil | 72 % | 1,4 × más lento | 9 |
| Medio | 100 % | normal | 12 |
| Difícil | 138 % | ráfagas de 3 tiros | 15 por tiro (45 por ráfaga) |

En Difícil, además, CENTINELA lleva un **fusil de plasma**, mejor que tu arma: dispara ráfagas de 3 proyectiles violetas que viajan más rápido (34 m/s frente a 24 m/s), así que cuesta más esquivarlos. También reacciona antes y apunta mejor. En Fácil falla más. En todos los niveles mejora un poco con cada ronda.

## Controles

**Teclado (PC)**

| Tecla | Acción |
|---|---|
| ↑ / ↓ | Avanzar y retroceder |
| ← / → | Girar (mantén pulsado para girar más rápido) |
| Espacio | Disparar (recarga automática cada 12 tiros) |
| A / D | Moverte de lado |
| M | Silenciar |

**Mando o joystick (PC y tablets)**: conéctalo por USB o Bluetooth y pulsa cualquier botón. Stick izquierdo para moverte, stick derecho o cruceta para girar, gatillo derecho, RB o A para disparar, Start para empezar y Select para silenciar. Vibra cuando te dan, si el mando lo permite.

**Pantalla táctil (teléfonos y tablets)**: flechas a la izquierda (se puede deslizar el dedo entre ellas) y botón FUEGO a la derecha. En Android y iPad pasa a pantalla completa y en horizontal al empezar.

## Desafiar a un amigo

Al terminar una partida toca **Desafiar a un amigo** (o **Enviar por WhatsApp**). Se comparte un enlace con tu marcador, tu tiempo y la dificultad. Tu amigo lo abre, juega en la misma dificultad y al final ve si te superó: gana quien venció a CENTINELA, luego quien le sacó más diferencia de rondas y, si empatan, quien lo hizo en menos tiempo. Desde ahí puede devolverte el desafío.

No hace falta cuenta ni servidor: todo el reto viaja dentro del enlace.

## Instalar como app

- **Android**: abre la dirección en Chrome y toca **Instalar app** en el menú del juego, o en el menú de Chrome (⋮) **Agregar a pantalla principal**.
- **iPhone / iPad**: abre la dirección en Safari, toca **Compartir** y luego **Agregar a inicio**.
- **PC**: en Chrome o Edge, el ícono de instalar en la barra de direcciones.

La app funciona sin internet después de la primera visita y se actualiza sola.

## Cómo funciona

- CENTINELA patrulla la arena, te busca cuando te pierde de vista y mejora su puntería, cadencia y velocidad en cada ronda.
- Sus proyectiles son lentos y se pueden esquivar; los bloques de hormigón sirven de cobertura.
- Todo el juego está en un solo archivo: escena, IA, efectos, sonido sintetizado con Web Audio y la cara del enemigo dibujada en un canvas. El motor 3D (three.js r128) se carga desde cdnjs.
