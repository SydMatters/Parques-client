import { Tablero } from "./Tablero";

type JuegoProps = {
  nombres: string[];
  turno: number;
  onFichaSeleccionada: (index: number) => void;
};

export function Juego({ nombres, turno, onFichaSeleccionada }: JuegoProps) {
  const colores = ["#0000FF", "#FF0000", "#00AA00", "#FFFF00"];

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

  const fichas = [];
  for (let j = 0; j < 4; j++) {
    for (let f = 0; f < 4; f++) {
      const pos = prisiones[j][f];
      fichas.push({
        x: pos.x,
        y: pos.y,
        color: colores[j],
      });
    }
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
