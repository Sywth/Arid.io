import { RequestJoinRoom, JoinRoom, SOCKET_EVENTS } from '@shared/sharedTypes';
import { useEffect, useState } from 'react';
import { useSocket } from './hooks/Socket';
import { useGameContext } from './hooks/LocalGameState';
import GameRoom from './components/GameRoom';
import { Euler, Vector3 } from 'three';
import { RenderBuildingData } from './types';

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
