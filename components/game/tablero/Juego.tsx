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
  // Colocamos cada color en su camino real:
  // azul (fila lógica 1) → camino horizontal superior (CAMINO_AZUL)
  // rojo (3) → camino vertical derecho (CAMINO_ROJO)
  // verde (0) → camino vertical izquierdo (CAMINO_VERDE)
  // amarillo (2) → camino horizontal inferior (CAMINO_AMARILLO)
  const caminos = {
    blue: { x: 290, y: 150, width: 220, height: 140, orientation: "horizontal" as const },
    red: { x: 510, y: 290, width: 140, height: 220, orientation: "vertical" as const },
    green: { x: 150, y: 290, width: 140, height: 220, orientation: "vertical" as const },
    yellow: { x: 290, y: 510, width: 220, height: 140, orientation: "horizontal" as const },
  };
  const color = fila === 1 ? "blue" : fila === 3 ? "red" : fila === 0 ? "green" : "yellow";
  const camino = caminos[color as CanonicalColor];
  const steps = 24;
  if (camino.orientation === "horizontal") {
    const stepX = camino.width / steps;
    const y = camino.y + camino.height / 2;
    return { x: camino.x + columna * stepX + stepX / 2, y };
  } else {
    const stepY = camino.height / steps;
    const x = camino.x + camino.width / 2;
    return { x, y: camino.y + columna * stepY + stepY / 2 };
  }
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
