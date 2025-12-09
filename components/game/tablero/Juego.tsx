import type { BackendGameState } from "../types";
import { Tablero } from "./Tablero";

type JuegoProps = {
  nombres: string[];
  turno: number;
  gameState: BackendGameState | null;
  onFichaSeleccionada: (index: number) => void;
};

const colorHex = ["#00AA00", "#0000FF", "#FFFF00", "#FF0000"];

const prisiones: Record<number, { x: number; y: number }[]> = {
  0: [
    { x: 192.5, y: 192.5 },
    { x: 227.5, y: 192.5 },
    { x: 192.5, y: 227.5 },
    { x: 227.5, y: 227.5 },
  ],
  1: [
    { x: 552.5, y: 192.5 },
    { x: 587.5, y: 192.5 },
    { x: 552.5, y: 227.5 },
    { x: 587.5, y: 227.5 },
  ],
  2: [
    { x: 192.5, y: 552.5 },
    { x: 227.5, y: 552.5 },
    { x: 192.5, y: 587.5 },
    { x: 227.5, y: 587.5 },
  ],
  3: [
    { x: 552.5, y: 552.5 },
    { x: 587.5, y: 552.5 },
    { x: 552.5, y: 587.5 },
    { x: 587.5, y: 587.5 },
  ],
};

// Mapea fila/columna del tablero lógico a coordenadas SVG sencillas
const mapToCoords = (row: number, col: number) => {
  const baseX = 120;
  const baseY = 120;
  const cell = 18;
  return { x: baseX + col * cell, y: baseY + row * cell };
};

export function Juego({ nombres, turno, gameState, onFichaSeleccionada }: JuegoProps) {
  const fichas: { x: number; y: number; color: string }[] = [];

  if (gameState?.state?.players?.length) {
    gameState.state.players.forEach((p, pIdx) => {
      p.tokens.forEach((t) => {
        const index = pIdx * 4 + t.id;
        if (t.in_goal) {
          fichas[index] = { x: 380 + pIdx * 8, y: 380 + t.id * 8, color: colorHex[pIdx] };
        } else if (t.in_jail) {
          const pos = prisiones[pIdx]?.[t.id];
          fichas[index] = { x: pos?.x ?? 50, y: pos?.y ?? 50, color: colorHex[pIdx] };
        } else if (t.x !== null && t.y !== null) {
          const pos = mapToCoords(t.x, t.y);
          fichas[index] = { x: pos.x, y: pos.y, color: colorHex[pIdx] };
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
