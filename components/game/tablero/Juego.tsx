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
  return "green";
};

// Hex por color lógico
const colorHex: Record<CanonicalColor, string> = {
  green: "#50C878",
  blue: "#4682B4",
  yellow: "#FFFF00",
  red: "#FF0000",
};

// Fila lógica “asociada” a cada color para la salida por defecto
const colorRow: Record<CanonicalColor, number> = {
  green: 3,   // carril inferior
  blue: 0,    // carril superior
  yellow: 2,  // carril inferior lado derecho
  red: 1,     // carril superior lado derecho
};

// Coordenadas centrales de las cárceles dentro de cada cuadrante de color
const prisiones: Record<CanonicalColor, { x: number; y: number }[]> = {
  green: [
    { x: 180, y: 540 },
    { x: 225, y: 540 },
    { x: 180, y: 585 },
    { x: 225, y: 585 },
  ],
  blue: [
    { x: 180, y: 180 },
    { x: 225, y: 180 },
    { x: 180, y: 225 },
    { x: 225, y: 225 },
  ],
  yellow: [
    { x: 540, y: 540 },
    { x: 585, y: 540 },
    { x: 540, y: 585 },
    { x: 585, y: 585 },
  ],
  red: [
    { x: 540, y: 180 },
    { x: 585, y: 180 },
    { x: 540, y: 225 },
    { x: 585, y: 225 },
  ],
};

// Mapea fila/columna lógica (fila 0..3, col 0..23) a coordenadas SVG
const mapToCoords = (fila: number, columna: number) => {
  // fila lógica -> fila visual (0=arriba). Queremos: azul arriba izq (fila lógica 1),
  // rojo arriba der (fila lógica 3), verde abajo izq (fila lógica 0), amarillo abajo der (fila lógica 2)
  const rowMap = [2, 0, 3, 1];
  const displayRow = rowMap[fila] ?? fila;
  const baseX = 150;
  const baseY = 150;
  const cellX = 500 / 24;
  const cellY = 500 / 4;
  return {
    x: baseX + columna * cellX + cellX / 2,
    y: baseY + displayRow * cellY + cellY / 2,
  };
};

export function Juego({ nombres, turno, gameState, onFichaSeleccionada }: JuegoProps) {
  const fichas: { x: number; y: number; color: string }[] = [];

  if (gameState?.state?.players?.length) {
    gameState.state.players.forEach((p, pIdx) => {
      const colorKey = normalizeColor(p.color);
      const color = colorHex[colorKey];
      const jailSlots = prisiones[colorKey];

      p.tokens.forEach((t) => {
        const index = pIdx * 4 + t.id;

        if (t.in_goal) {
          // Fichas en la meta
          fichas[index] = {
            x: 380 + pIdx * 8,
            y: 380 + t.id * 8,
            color,
          };
        } else if (t.in_jail) {
          // Fichas en la cárcel
          const pos = jailSlots?.[t.id];
          fichas[index] = {
            x: pos?.x ?? 50,
            y: pos?.y ?? 50,
            color,
          };
        } else if (t.x !== null && t.y !== null) {
          // Backend: x = columna (0..23), y = fila (0..3)
          const pos = mapToCoords(t.y, t.x);
          fichas[index] = { x: pos.x, y: pos.y, color };
        } else {
          // Ficha ya salió pero no tiene coords aún: mostrarla en su salida
          const fila = colorRow[colorKey];
          const columnaSalida = 4; // ajusta por color si quieres afinar
          const pos = mapToCoords(fila, columnaSalida);
          fichas[index] = { x: pos.x, y: pos.y, color };
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
