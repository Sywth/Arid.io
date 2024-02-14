type Player = {
  playerId: string;
  displayName: string;
  society: Society;
};

type Society = {
  societyId: string;
  color: string;
  buildings: BuildingInstance[];
};

type MapGeometry = {
  vertices: Float32Array;
  indices: Uint16Array;
};

type Room = {
  players: Player[];
  roomId: string;
  mapGeometry: MapGeometry;
};

type Rooms = {
  [roomId: string]: Room;
};

type RequestJoinRoom = {
  roomId: string;
  displayName: string;
};

type JoinRoom = {
  playerId: string;
  roomState: Room;
};

type BuildingType = 'headQuarters' | 'powerPlant' | 'ghost';
type BuildingInstance = {
  buildingType: BuildingType;
  cutback: number;
  position: Vector3;
};
type Vector3 = {
  x: number;
  y: number;
  z: number;
};
type Vector2 = {
  x: number;
  y: number;
};

type GameRequest = {
  playerId: string;
  roomId: string;
};
type RequestAddBuilding = GameRequest & {
  buildingType: BuildingType;
  position: Vector3;
};
type ServerResponse = {};
type ServerAddedBuilding = ServerResponse & {
  playerId: string;
  buildingInstance: BuildingInstance;
};
type ServerPlayerJoined = ServerResponse & {
  player: Player;
};
enum SOCKET_EVENTS {
  REQUEST_JOIN_ROOM = 'requestJoinRoom',
  ROOM_JOINED = 'roomJoined',
  NEW_PLAYER_JOINED_ROOM = 'newPlayerJoinedRoom',
  ROOM_JOIN_ERROR = 'roomJoinError',
  REQUEST_ADD_BUILDING = 'requestAddBuilding',
  SERVER_ADDED_BUILDING = 'serverAddedBuilding',
}
export type {
  Player,
  Room,
  Rooms,
  JoinRoom,
  RequestJoinRoom,
  MapGeometry,
  BuildingInstance,
  BuildingType,
  RequestAddBuilding,
  Society,
  ServerAddedBuilding,
  Vector3,
  ServerPlayerJoined,
};
export { SOCKET_EVENTS };
