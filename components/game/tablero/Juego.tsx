import type { BackendGameState } from "../types";
import { Tablero } from "./Tablero";

type JuegoProps = {
  nombres: string[];
  turno: number;
  gameState: BackendGameState | null;
  onFichaSeleccionada: (index: number) => void;
};

// Colores canónicos del tablero
type CanonicalColor = "green" | "blue" | "yellow" | "red";

// Normaliza los nombres que vienen del backend ("azul"/"blue", etc.)
const normalizeColor = (name?: string): CanonicalColor => {
  const n = (name || "").toLowerCase();
  if (n === "verde" || n === "green") return "green";
  if (n === "azul" || n === "blue") return "blue";
  if (n === "amarillo" || n === "yellow") return "yellow";
  if (n === "rojo" || n === "red") return "red";
  // por defecto, verde
  return "green";
};

// Hex por color lógico
const colorHex: Record<CanonicalColor, string> = {
  green: "#50C878",
  blue: "#4682B4",
  yellow: "#FFFF00",
  red: "#FF0000",
};

// Coordenadas centrales de las cárceles dentro de cada cuadrante de color
const prisiones: Record<CanonicalColor, { x: number; y: number }[]> = {
  // Verde (abajo izquierda) cuadrante 150-290 x 510-650
  green: [
    { x: 180, y: 540 },
    { x: 225, y: 540 },
    { x: 180, y: 585 },
    { x: 225, y: 585 },
  ],
  // Azul (arriba izquierda) cuadrante 150-290 x 150-290
  blue: [
    { x: 180, y: 180 },
    { x: 225, y: 180 },
    { x: 180, y: 225 },
    { x: 225, y: 225 },
  ],
  // Amarillo (abajo derecha) cuadrante 510-650 x 510-650
  yellow: [
    { x: 540, y: 540 },
    { x: 585, y: 540 },
    { x: 540, y: 585 },
    { x: 585, y: 585 },
  ],
  // Rojo (arriba derecha) cuadrante 510-650 x 150-290
  red: [
    { x: 540, y: 180 },
    { x: 585, y: 180 },
    { x: 540, y: 225 },
    { x: 585, y: 225 },
  ],
};

// Mapea fila/columna del tablero lógico a coordenadas SVG
// Tablero dibujado de 150 a 650 (500px). 24 columnas, 4 filas.
// Simplificado: alineamos cada color a una banda horizontal fija para que no invada celdas seguras.
const mapToCoords = (fila: number, columna: number) => {
  // filas visuales por color: verde (abajo), azul (arriba), amarillo (abajo), rojo (arriba)
  const rowY: Record<number, number> = {
    0: 585, // verde
    1: 215, // azul
    2: 540, // amarillo
    3: 185, // rojo
  };
  const y = rowY[fila] ?? 400;
  const baseX = 160; // un poco de margen para centrar en camino
  const cellX = 500 / 24;
  const x = baseX + columna * cellX;
  return { x, y };
};

export function Juego({ nombres, turno, gameState, onFichaSeleccionada }: JuegoProps) {
  const fichas: { x: number; y: number; color: string }[] = [];

  if (gameState?.state?.players?.length) {
    gameState.state.players.forEach((p, pIdx) => {
      const colorKey = normalizeColor(p.color);
      const color = colorHex[colorKey];
      const jailSlots = prisiones[colorKey];

      p.tokens.forEach((t) => {
        // index global = jugador * 4 + id de ficha (lo sigues usando en los modales)
        const index = pIdx * 4 + t.id;

        if (t.in_goal) {
          // Fichas en la meta (las coloco cerca del centro, pequeño offset por jugador/ficha)
          fichas[index] = {
            x: 380 + pIdx * 8,
            y: 380 + t.id * 8,
            color,
          };
        } else if (t.in_jail) {
          // Fichas en la cárcel, según color real
          const pos = jailSlots?.[t.id];
          fichas[index] = {
            x: pos?.x ?? 50,
            y: pos?.y ?? 50,
            color,
          };
        } else if (t.x !== null && t.y !== null) {
          // Fichas en el camino (coordenadas lógicas que vienen del backend)
          const pos = mapToCoords(t.x, t.y);
          fichas[index] = { x: pos.x, y: pos.y, color };
        } else {
          // Estado inconsistente: no en cárcel, no en meta y sin coords;
          // mejor no dibujar nada antes que pintarla en una salida equivocada.
        }
      });
    });
  }

  return (
    <div className="flex flex-col items-center">
      <p className="text-sm text-gray-600 font-semibold mb-2">
        Turno: {nombres[turno]} (Jugador {turno + 1})
      </p>
      <Tablero fichas={fichas} onFichaClick={onFichaSeleccionada} />
    </div>
  );
}
