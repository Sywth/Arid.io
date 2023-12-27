import {
  Player,
  SOCKET_EVENTS,
  ServerPlayerJoined,
} from '@shared/sharedTypes';
import { useSocket } from '../hooks/Socket';
import { useGameContext } from '../hooks/LocalGameState';
import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import RenderGameboard from './RenderGameboard';
import { KeyboardControls, KeyboardControlsEntry } from '@react-three/drei';
import { Controls } from '../types';

type GameboardProps = {};
const GameBoard = ({}: GameboardProps) => {
  const { mapGeometry } = useGameContext()!;

  if (!mapGeometry) {
    console.error('Map geometry not found');
    return null;
  }

  const SIDE_LENGTH = 75;

  return (
    <Suspense fallback={null}>
      <Canvas
        shadows={true}
        camera={{ position: [SIDE_LENGTH / 2, 15, SIDE_LENGTH / 2], fov: 75 }}
        className="rounded-3xl bg-base-100"
      >
        <ambientLight intensity={0.25} />
        <RenderGameboard mapGeometry={mapGeometry} />
      </Canvas>
    </Suspense>
  );
};

type LobbyDisplayProps = React.HTMLAttributes<HTMLUListElement> & {
  players: Player[];
};

const LobbyDisplay = ({ className, players, ...props }: LobbyDisplayProps) => {
  return (
    <ul className={`menu text-lg ${className}`} {...props}>
      {players.map(player => (
        <li
          key={player.playerId}
          className="flex flex-row justify-between items-center "
        >
          <a className="w-full py-1 my-[0.125rem]">
            <div
              className={`w-[15px] h-[15px] rounded-full`}
              style={{
                backgroundColor: `${player.society.color}`,
              }}
            />
            {player.displayName}
          </a>
        </li>
      ))}
    </ul>
  );
};

type GameRoomProps = {};
const GameRoom = ({}: GameRoomProps) => {
  console.log('Room Initialized');

  const socket = useSocket()!;
  const { players, setPlayers } = useGameContext()!;

  socket.on(
    SOCKET_EVENTS.NEW_PLAYER_JOINED_ROOM,
    ({ player }: ServerPlayerJoined) => {
      console.log('New player joined room ', player);
      setPlayers([...players, player]);
    },
  );

  const map = useMemo<KeyboardControlsEntry<Controls>[]>(
    () => [{ name: Controls.engaged, keys: ['ArrowUp', 'KeyW'] }],
    [],
  );

  return (
    <KeyboardControls map={map}>
      <div className="h-screen w-screen flex flex-row overflow-hidden bg-base-200 p-2">
        <LobbyDisplay className="bg-base-200 w-[12%] " players={players} />
        <GameBoard />
      </div>
    </KeyboardControls>
  );
};

export default GameRoom;
export type { GameRoomProps };
