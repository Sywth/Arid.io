import {
  RequestJoinRoom,
  JoinRoom,
  MapGeometry,
  BuildingType,
  RequestAddBuilding,
  Vector3 as ServerVector3,
  ServerAddedBuilding,
  Player,
  ServerPlayerJoined,
} from '@shared/sharedTypes';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, MeshProps, ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { BufferAttribute, Euler, Vector3 } from 'three';
import { useSocket } from './Socket';
import { RenderBuildingData, useGameContext } from './LocalGameState';
import { generateUUID } from 'three/src/math/MathUtils.js';

enum SOCKET_EVENTS {
  REQUEST_JOIN_ROOM = 'requestJoinRoom',
  ROOM_JOINED = 'roomJoined',
  NEW_PLAYER_JOINED_ROOM = 'newPlayerJoinedRoom',
  ROOM_JOIN_ERROR = 'roomJoinError',
  REQUEST_ADD_BUILDING = 'requestAddBuilding',
  SERVER_ADDED_BUILDING = 'serverAddedBuilding',
}

enum DOM_ELEMENTS {
  GAME_CANVAS = 'gameCanvas',
}

type MapMeshProps = { mapGeometry: MapGeometry } & MeshProps;
const MapMesh = ({ mapGeometry, ...props }: MapMeshProps) => {
  const vertices: Float32Array = new Float32Array(mapGeometry.vertices);
  const indices: Uint16Array = new Uint16Array(mapGeometry.indices);

  return (
    <mesh receiveShadow={true} castShadow={true} {...props}>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          count={vertices.length / 3}
          array={vertices}
          itemSize={3}
        />
        <bufferAttribute
          attach={geometry => {
            geometry.setIndex(new BufferAttribute(indices, 1));
            return () => geometry.setIndex(null);
          }}
        />
      </bufferGeometry>
      <meshStandardMaterial attach="material" color={0x819852} wireframe />
    </mesh>
  );
};

const DrawRenderModifications = () => {
  const { renderModifications } = useGameContext()!;
  const { buildings } = renderModifications;
  console.log('Rendered draw render modifications ', renderModifications);

  return (
    <>
      {buildings.map(building => {
        return (
          <mesh
            key={generateUUID()}
            receiveShadow={true}
            castShadow={true}
            position={building.position}
            rotation={building.rotation}
          >
            <boxGeometry />
            <meshStandardMaterial color={building.color} />
          </mesh>
        );
      })}
    </>
  );
};

type RenderGameboardProps = { mapGeometry: MapGeometry };
const RenderGameboard = ({ mapGeometry }: RenderGameboardProps) => {
  const {
    thisPlayerId,
    roomId,
    setRenderModifications,
    renderModifications,
    players,
  } = useGameContext()!;
  const socket = useSocket()!;

  useEffect(() => {
    const handleServerAddedBuilding = ({
      playerId,
      buildingInstance,
    }: ServerAddedBuilding) => {
      const player = players.find(player => player.playerId === playerId);
      if (!player) {
        console.error('Player not found');
        return;
      }

      const newRenderModifications = {
        ...renderModifications,
        buildings: [
          ...renderModifications.buildings,
          {
            buildingsType: buildingInstance.buildingType,
            position: new Vector3(
              buildingInstance.position.x,
              buildingInstance.position.y,
              buildingInstance.position.z,
            ),
            rotation: new Euler(0, 0, 0),
            color: player.society.color,
          },
        ],
      };
      setRenderModifications(newRenderModifications);
    };

    socket.on(SOCKET_EVENTS.SERVER_ADDED_BUILDING, handleServerAddedBuilding);
    return () => {
      socket.off(SOCKET_EVENTS.SERVER_ADDED_BUILDING);
    };
  }, [socket, players, renderModifications, setRenderModifications]);

  const placeBuilding = (point: Vector3) => {
    const req: RequestAddBuilding = {
      playerId: thisPlayerId!,
      roomId: roomId!,
      buildingType: 'powerPlant' as BuildingType,
      position: { x: point.x, y: point.y + 0.5, z: point.z } as ServerVector3,
    };
    console.log('Request server to add building ', req);
    socket.emit(SOCKET_EVENTS.REQUEST_ADD_BUILDING, req);
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    const clickPosition = e.point;
    placeBuilding(clickPosition);
  };

  return (
    <>
      <MapMesh mapGeometry={mapGeometry} onClick={handleClick} />
      <DrawRenderModifications />
      <OrbitControls />
    </>
  );
};

type GameboardProps = {};
const GameBoard = ({}: GameboardProps) => {
  const { mapGeometry } = useGameContext()!;

  if (!mapGeometry) {
    console.error('Map geometry not found');
    return null;
  }

  return (
    <Suspense fallback={null}>
      <Canvas
        shadows={true}
        camera={{ position: [0, 0, 5] }}
        id={DOM_ELEMENTS.GAME_CANVAS}
        className="rounded-3xl bg-base-100"
      >
        <ambientLight intensity={1} />
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

  return (
    <div className="h-screen w-screen flex flex-row overflow-hidden bg-base-200 p-2">
      <LobbyDisplay className="bg-base-200 w-[12%] " players={players} />
      <GameBoard />
    </div>
  );
};

type RoomJoinPromptProps = {};
const RoomJoinPrompt = ({}: RoomJoinPromptProps) => {
  const socket = useSocket();
  const [roomIdString, setRoomIdString] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');

  const joinRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!socket) {
      alert('Socket not connected. Wait and try again.');
      return;
    }
    const req: RequestJoinRoom = {
      roomId: roomIdString,
      displayName,
    };
    socket.emit(SOCKET_EVENTS.REQUEST_JOIN_ROOM, req);
  };

  return (
    <div className="h-screen w-screen flex flex-row items-center justify-center">
      <form className="join" onSubmit={joinRoom}>
        <div>
          <div>
            <input
              className="input input-bordered join-item"
              placeholder="Room ID"
              value={roomIdString}
              onChange={e => setRoomIdString(e.target.value)}
            />
          </div>
        </div>
        <div>
          <div>
            <input
              className="input input-bordered join-item"
              placeholder="Display Name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
          </div>
        </div>

        <div className="indicator">
          <button
            type="submit"
            className="btn join-item"
            disabled={roomIdString === '' || displayName === ''}
          >
            Join Room
          </button>
        </div>
      </form>
    </div>
  );
};

const App = () => {
  const socket = useSocket();
  const ctx = useGameContext();
  const [inRoom, setInRoom] = useState<boolean>(false);

  if (!ctx) {
    console.error('Game context not found');
    return null;
  }
  const {
    setRoomId,
    setThisPlayerId,
    setPlayers,
    setRenderModifications,
    setMapGeometry,
  } = ctx;

  useEffect(() => {
    if (!socket) {
      console.error('Socket not connected');
      return;
    }

    socket.on(SOCKET_EVENTS.ROOM_JOINED, (joinRoomResponse: JoinRoom) => {
      console.log(SOCKET_EVENTS.ROOM_JOINED, joinRoomResponse);
      setRoomId(joinRoomResponse.roomState.roomId);
      setThisPlayerId(joinRoomResponse.playerId);
      setPlayers(joinRoomResponse.roomState.players);

      const buildings: RenderBuildingData[] = [];
      joinRoomResponse.roomState.players.forEach(player => {
        player.society.buildings.forEach(building => {
          buildings.push({
            buildingsType: building.buildingType,
            position: new Vector3(
              building.position.x,
              building.position.y,
              building.position.z,
            ),
            rotation: new Euler(0, 0, 0),
            color: player.society.color,
          });
        });
      });

      setRenderModifications({ buildings });
      setMapGeometry(joinRoomResponse.roomState.mapGeometry);

      setInRoom(true);
    });

    return () => {
      socket.off(SOCKET_EVENTS.ROOM_JOINED);
    };
  }, [socket]);

  return (
    <div className=" overflow-hidden">
      {inRoom === true ? <GameRoom /> : <RoomJoinPrompt />}
    </div>
  );
};
export default App;
