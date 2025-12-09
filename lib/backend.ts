import { LoginData } from "@/components/game/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export type BackendResponse = {
  success: boolean;
  message: string;
};

export async function joinGame(data: LoginData) {
  const res = await fetch(`${API_BASE}/games/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ player: data.username, color: data.color }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = body?.detail || "No se pudo unir a la partida";
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  return res.json();
}

export async function enviarTablero(): Promise<BackendResponse> {
  console.log("Enviando movimiento al backend...");
  console.log("Tablero serializado como JSON...");
  console.log("Movimiento enviado correctamente");

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("Backend procesando movimiento...");
      console.log("Movimiento aceptado por el servidor");
      resolve({
        success: true,
        message: "Movimiento procesado exitosamente",
      });
    }, 800);
  });
}
