import { Player, BuildingType, MapGeometry } from '@shared/sharedTypes';
import React, { createContext, useContext, useState } from 'react';
import { Euler, Vector3 } from 'three';

type RenderBuildingData = {
  buildingsType: BuildingType;
  position: Vector3;
  rotation: Euler;
  color: string;
};

type RenderModifications = {
  buildings: RenderBuildingData[];
};

interface GameContextType {
  roomId: string | null;
  setRoomId: React.Dispatch<React.SetStateAction<string | null>>;
  thisPlayerId: string | null;
  setThisPlayerId: React.Dispatch<React.SetStateAction<string | null>>;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  renderModifications: RenderModifications;
  setRenderModifications: React.Dispatch<
    React.SetStateAction<RenderModifications>
  >;
  mapGeometry: MapGeometry | null;
  setMapGeometry: React.Dispatch<React.SetStateAction<MapGeometry | null>>;
}

const GameContext = createContext<GameContextType | null>(null);
const useGameContext = () => useContext(GameContext);

type GameProviderProps = { children: React.ReactNode };
const GameProvider = ({ children }: GameProviderProps) => {
  const [roomId, setRoomId] = useState<string | null>('');
  const [thisPlayerId, setThisPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [renderModifications, setRenderModifications] =
    useState<RenderModifications>({
      buildings: [],
    });
  const [mapGeometry, setMapGeometry] = useState<MapGeometry | null>(null);

  const value: GameContextType = {
    thisPlayerId,
    setThisPlayerId,
    players,
    setPlayers,
    roomId,
    setRoomId,
    renderModifications,
    setRenderModifications,
    mapGeometry,
    setMapGeometry,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export { useGameContext, GameProvider };
export type { GameContextType, RenderModifications, RenderBuildingData };
