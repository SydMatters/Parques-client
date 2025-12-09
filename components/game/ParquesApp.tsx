"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Controls } from "./Controls";
import { Dado } from "./Dado";
import { JugadoresPanel } from "./JugadoresPanel";
import { LoginCard } from "./LoginCard";
import { Juego } from "./tablero/Juego";
import { AlertModal } from "./modals/AlertModal";
import { ConfirmModal } from "./modals/ConfirmModal";
import { DiceModal } from "./modals/DiceModal";
import { ModalAviso } from "./modals/ModalAviso";
import { TurnModal } from "./modals/TurnModal";
import { TurnoCompletadoModal } from "./modals/TurnoCompletadoModal";
import { StartGameModal } from "./modals/StartGameModal";
import type { BackendGameState, FichaInfo, LoginData, Player } from "./types";
import { startGame } from "@/lib/backend";

const colorMap = {
  azul: { hex: "#0000FF", label: "Azul", icon: "🔵" },
  rojo: { hex: "#FF0000", label: "Rojo", icon: "🔴" },
  verde: { hex: "#00AA00", label: "Verde", icon: "🟢" },
  amarillo: { hex: "#FFFF00", label: "Amarillo", icon: "🟡" },
  blue: { hex: "#0000FF", label: "Azul", icon: "🔵" },
  red: { hex: "#FF0000", label: "Rojo", icon: "🔴" },
  green: { hex: "#00AA00", label: "Verde", icon: "🟢" },
  yellow: { hex: "#FFFF00", label: "Amarillo", icon: "🟡" },
} as const;

const fallbackColors = Object.values(colorMap).slice(0, 4);

const mapColor = (name?: string) => {
  if (!name) return fallbackColors[0];
  const key = name.toLowerCase() as keyof typeof colorMap;
  return colorMap[key] || fallbackColors[0];
};

type ParquesAppProps = {
  initialLoginData?: LoginData | null;
};

export function ParquesApp({ initialLoginData = null }: ParquesAppProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(initialLoginData));
  const [loginData, setLoginData] = useState<LoginData | null>(initialLoginData);
  const [dadoValores, setDadoValores] = useState<[number | null, number | null]>([1, 1]);
  const [diceModalOpen, setDiceModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [turnModalOpen, setTurnModalOpen] = useState(false);
  const [turnoCompletadoModalOpen, setTurnoCompletadoModalOpen] = useState(false);
  const [avisoModalOpen, setAvisoModalOpen] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [turno, setTurno] = useState(0);
  const [fichaInfo, setFichaInfo] = useState<FichaInfo | null>(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [avisoInfo] = useState<{
    tipo: "info" | "alerta" | "comida";
    titulo: string;
    mensaje: string;
    jugador: Player | null;
    fichaComida: { id: number } | null;
  }>({
    tipo: "info",
    titulo: "",
    mensaje: "",
    jugador: null,
    fichaComida: null,
  });
  const [gameState, setGameState] = useState<BackendGameState | null>(null);
  const lastRollRef = useRef<string>("");
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const lastStatusRef = useRef<string>("");
  const isMyTurn = loginData && gameState?.state.turn === loginData.username && gameState?.status === "running";
  const isHost = Boolean(
    loginData &&
      (
        (gameState?.host && gameState.host === loginData.username) ||
        (!gameState?.host && gameState?.state.players?.[0]?.name === loginData.username) ||
        (!gameState && loginData)
      )
  );
  const canRoll = isMyTurn && connected && gameState?.status === "running";

  const jugadores: Player[] = useMemo(() => {
    if (gameState?.state.players?.length) {
      return gameState.state.players.map((p) => {
        const mapped = mapColor(p.color);
        return {
          nombre: p.name,
          color: mapped.hex,
          colorName: mapped.label,
          icon: mapped.icon,
          estado: "Jugando",
        };
      });
    }
    return ["Jugador 1", "Jugador 2", "Jugador 3", "Jugador 4"].map((nombre, i) => ({
      nombre,
      color: fallbackColors[i]?.hex || "#000",
      colorName: fallbackColors[i]?.label || "Color",
      icon: fallbackColors[i]?.icon || "🎲",
      estado: "Jugando",
    }));
  }, [gameState]);

  const handleLogin = (data: LoginData) => {
    setLoginData(data);
    setIsLoggedIn(true);
    setTimeout(() => {
      mostrarAlerta(`¡Bienvenido ${data.username}! Esperando jugadores...`);
    }, 500);
  };

  const mostrarAlerta = (mensaje: string) => {
    setAlertMessage(mensaje);
    setAlertModalOpen(true);
  };

  const applyState = (state: BackendGameState) => {
    setGameState(state);
    if (state.status !== lastStatusRef.current) {
      if (state.status === "running") {
        setStartModalOpen(true);
        setTimeout(() => setStartModalOpen(false), 1500);
      }
      lastStatusRef.current = state.status;
    }
    if (state.state.turn) {
      const idx = state.state.players.findIndex((p) => p.name === state.state.turn);
      setTurno(idx >= 0 ? idx : 0);
    }
    if (state.state.last_roll && state.state.last_roll.length === 2) {
      setDadoValores([state.state.last_roll[0], state.state.last_roll[1]]);
      const rollKey = state.state.last_roll.join("-");
      if (rollKey !== lastRollRef.current) {
        lastRollRef.current = rollKey;
        setDiceModalOpen(true);
        setTimeout(() => setDiceModalOpen(false), 800);
      }
    }
  };

  useEffect(() => {
    if (!loginData) return;
    const wsBase = process.env.NEXT_PUBLIC_WS_BASE || process.env.NEXT_PUBLIC_API_BASE?.replace("http", "ws") || "ws://127.0.0.1:8000";
    const url = `${wsBase}/ws/tcp?player=${encodeURIComponent(loginData.username)}&color=${encodeURIComponent(loginData.color)}`;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        if (!stopped) {
          setTimeout(connect, 800);
        }
      };
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const statePayload: BackendGameState | undefined = payload.state;
          if (payload.type === "state" && statePayload) {
            applyState(statePayload);
          } else if (payload.type === "joined" && statePayload) {
            applyState(statePayload);
          } else if (payload.type === "rolled" && statePayload) {
            applyState(statePayload);
          } else if (payload.type === "error") {
            mostrarAlerta(payload.message || "Error de servidor");
          }
        } catch (err) {
          console.error("WS parse error", err);
        }
      };
    };

    connect();
    return () => {
      stopped = true;
      wsRef.current?.close();
    };
  }, [loginData]);

  const handleTirarDado = () => {
    if (!loginData) return;
    if (!isMyTurn) {
      mostrarAlerta("Espera tu turno antes de tirar los dados");
      return;
    }
    if (wsRef.current && connected) {
      wsRef.current.send(JSON.stringify({ type: "roll" }));
    }
  };

  const handleFichaSeleccionada = (index: number) => {
    const jugadorIndex = Math.floor(index / 4);
    const jugador = jugadores[jugadorIndex];
    setFichaInfo({
      id: index,
      color: jugador.color,
      colorName: jugador.colorName,
      jugadorNombre: jugador.nombre,
    });
    setConfirmModalOpen(true);
  };

  const handleConfirmMovimiento = async () => {
    if (!loginData || !fichaInfo) return;
    if (!isMyTurn) {
      mostrarAlerta("Solo puedes mover durante tu turno");
      setConfirmModalOpen(false);
      return;
    }
    const steps = gameState?.state.last_roll?.reduce((a, b) => a + b, 0);
    if (wsRef.current && connected) {
      wsRef.current.send(JSON.stringify({ type: "move", token_id: fichaInfo.id % 4, steps }));
    }
    setConfirmModalOpen(false);
  };

  const handleStartGame = () => {
    if (!isHost) {
      mostrarAlerta("Solo el anfitrión puede iniciar la partida");
      return;
    }
    if ((gameState?.state.players.length || 0) < 2) {
      mostrarAlerta("Se necesitan al menos 2 jugadores para iniciar");
      return;
    }
    if (wsRef.current && connected) {
      wsRef.current.send(JSON.stringify({ type: "start" }));
    }
    startGame(loginData.username).catch((err) => {
      const message = err instanceof Error ? err.message : "No se pudo iniciar la partida";
      mostrarAlerta(message);
    });
  };

  const handleSiguienteJugador = () => {
    setTurnoCompletadoModalOpen(false);
    setAvisoModalOpen(false);
    setTurnModalOpen(true);
    setTimeout(() => setTurnModalOpen(false), 1500);
    setFichaInfo(null);
  };

  const handleCerrarTurnoCompletado = () => setTurnoCompletadoModalOpen(false);
  const handleCerrarAviso = () => setAvisoModalOpen(false);
  const handleCerrarAlerta = () => setAlertModalOpen(false);

  if (!isLoggedIn) {
    return <LoginCard onLogin={handleLogin} />;
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: "url(/fondo.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-pink-900/30 backdrop-blur-sm" />

      <div className="relative z-10 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl flex flex-col lg:flex-row items-start justify-center p-8 gap-8 max-w-7xl border-2 border-purple-200 w-full">
        <div className="flex flex-col items-center w-full lg:max-w-4xl">
          <div className="w-full mb-6 p-4 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 rounded-2xl text-center shadow-lg">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-lg">👤</span>
                <span className="text-white font-black text-lg">{loginData?.username}</span>
              </div>
              {loginData?.color && (
                <>
                  <div className="w-1 h-6 bg-white/40 rounded-full hidden sm:block" />
                  <div className="flex items-center gap-2">
                    <span className="text-white font-black text-lg">🎨</span>
                    <span className="text-white font-black text-lg capitalize">{loginData?.color}</span>
                  </div>
                </>
              )}
              {isHost && (
                <>
                  <div className="w-1 h-6 bg-white/40 rounded-full hidden sm:block" />
                  <button
                    type="button"
                    onClick={handleStartGame}
                    disabled={gameState?.status === "running" || !connected}
                    className="px-4 py-2 bg-white/20 text-white font-bold rounded-xl border border-white/30 hover:bg-white/30 disabled:opacity-60"
                  >
                    {gameState?.status === "running" ? "Juego en curso" : "Iniciar partida"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="w-full mb-6">
            <div className="text-center mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-4 border-blue-300 shadow-xl">
              <div className="text-sm text-gray-600 font-bold mb-2">TURNO ACTUAL</div>
              <h2 className="text-4xl font-black text-gray-800 mb-2 flex items-center justify-center gap-3">
                <span style={{ color: jugadores[turno]?.color }} className="animate-pulse">
                  {jugadores[turno]?.icon}
                </span>
                <span style={{ color: jugadores[turno]?.color }}>{jugadores[turno]?.nombre}</span>
              </h2>
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <p className="text-lg text-gray-600 font-semibold">
                  Jugador {turno + 1} de {jugadores.length}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-purple-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🎲</span>
                <h3 className="text-xl font-black text-gray-700">Dados</h3>
              </div>
              <div className="flex gap-8 justify-center items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                <Dado valor={dadoValores[0]} size={90} color="#f0e7ff" borderColor="#9333ea" />
                <Dado valor={dadoValores[1]} size={90} color="#fce7ff" borderColor="#ec4899" />
              </div>
            </div>
          </div>

          <div className="mb-6 p-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-purple-200 w-full">
            <Juego nombres={jugadores.map((j) => j.nombre)} turno={turno} onFichaSeleccionada={handleFichaSeleccionada} />
          </div>

          <div className="w-full max-w-md">
            <Controls
              onTirarDado={handleTirarDado}
              onSiguienteTurno={handleSiguienteJugador}
              disableRoll={!canRoll}
              disableNext={!canRoll}
              helper={
                connected
                  ? gameState?.status === "running"
                    ? isMyTurn
                      ? "Es tu turno"
                      : gameState?.state.turn
                        ? `Turno de ${gameState.state.turn}`
                        : undefined
                    : "Esperando inicio de partida"
                  : "Conectando al servidor..."
              }
            />
          </div>
        </div>

        <div className="flex flex-col items-center w-full lg:max-w-sm">
          <JugadoresPanel jugadores={jugadores} />
        </div>
      </div>

      {diceModalOpen && <DiceModal valores={dadoValores} />}
      {confirmModalOpen && fichaInfo && (
        <ConfirmModal mensaje={`¿Mover ficha ${fichaInfo.id + 1} (${fichaInfo.colorName})?`} fichaInfo={fichaInfo} onConfirm={handleConfirmMovimiento} onCancel={() => setConfirmModalOpen(false)} />
      )}
      {turnoCompletadoModalOpen && <TurnoCompletadoModal jugadorActual={jugadores[turno]} onSiguienteJugador={handleSiguienteJugador} onCerrar={handleCerrarTurnoCompletado} />}
      {turnModalOpen && <TurnModal nombre={jugadores[turno]?.nombre} colorName={jugadores[turno]?.colorName} color={jugadores[turno]?.color} />}
      {avisoModalOpen && <ModalAviso tipo={avisoInfo.tipo} titulo={avisoInfo.titulo} mensaje={avisoInfo.mensaje} jugador={avisoInfo.jugador || undefined} fichaComida={avisoInfo.fichaComida || undefined} onClose={handleCerrarAviso} />}
      {alertModalOpen && <AlertModal mensaje={alertMessage} onClose={handleCerrarAlerta} />}
      {startModalOpen && <StartGameModal players={jugadores.map((j) => j.nombre)} />}
    </div>
  );
}
