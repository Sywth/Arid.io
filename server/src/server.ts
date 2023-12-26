import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import {
  Player,
  JoinRoom,
  Room,
  RequestJoinRoom,
  RequestAddBuilding,
  Society,
  ServerAddedBuilding,
  BuildingInstance,
  ServerPlayerJoined,
} from '@shared/sharedTypes';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { createNoise2D } from 'simplex-noise';
import { inspect } from 'util';

const expressApp = express();

const httpServer = http.createServer(expressApp);

const FRONTEND_URL = 'http://localhost:5173';
const SERVER_PORT = 4257;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

const noise2D = createNoise2D();
const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});
expressApp.use(
  cors({
    origin: FRONTEND_URL,
  }),
  express.json(),
);

httpServer.listen(SERVER_PORT, () =>
  console.log(`[HTTP SERVER] Listening on port ${SERVER_PORT}`),
);

expressApp.get('/', (req, res) => {
  res.send(
    `
    <h1 style="text-align: center; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      Server is running at 
      <a href="${SERVER_URL}">
        ${SERVER_URL}
      </a>
    </h1>
    `,
  );
});

enum SOCKET_EVENTS {
  REQUEST_JOIN_ROOM = 'requestJoinRoom',
  ROOM_JOINED = 'roomJoined',
  NEW_PLAYER_JOINED_ROOM = 'newPlayerJoinedRoom',
  ROOM_JOIN_ERROR = 'roomJoinError',
  REQUEST_ADD_BUILDING = 'requestAddBuilding',
  SERVER_ADDED_BUILDING = 'serverAddedBuilding',
}

const rooms: { [roomId: string]: Room } = {};

const getRandomColor = () => {
  return `#${Math.floor(Math.random() * 16777215)
    .toString(16)
    .padEnd(6, '0')}`;
};
const noiseFunction = (x: number, z: number): number => {
  return (noise2D(x / 12, z / 12) + 1) / 2;
};

const generateHeightMap = () => {
  const TERRAIN_LEVELS = 5;
  const MAX_HEIGHT = 6;
  const WIDTH = 75;
  const DEPTH = 75;
  const heightMap = new Array(WIDTH);
  for (let i = 0; i < WIDTH; i++) {
    heightMap[i] = new Array(DEPTH);
    for (let j = 0; j < DEPTH; j++) {
      let height = noiseFunction(i, j);

      // discretize the heights
      height = Math.floor(height * TERRAIN_LEVELS) / TERRAIN_LEVELS;
      height *= MAX_HEIGHT;
      heightMap[i][j] = height;
    }
  }
  return heightMap;
};

const generateMapFromHeightMap = (heightMap: number[][]) => {
  const WIDTH = heightMap.length;
  const DEPTH = heightMap[0].length;
  const vertices = new Float32Array(WIDTH * DEPTH * 3);
  const indices = new Uint16Array((WIDTH - 1) * (DEPTH - 1) * 6);

  for (let z = 0; z < DEPTH; z++) {
    for (let x = 0; x < WIDTH; x++) {
      const vertexIndex = (z * WIDTH + x) * 3;
      vertices[vertexIndex + 0] = x;
      vertices[vertexIndex + 1] = heightMap[z][x];
      vertices[vertexIndex + 2] = z;
    }
  }

  let index = 0;
  for (let z = 0; z < DEPTH - 1; z++) {
    for (let x = 0; x < WIDTH - 1; x++) {
      const topLeft = z * WIDTH + x;
      const topRight = z * WIDTH + x + 1;
      const bottomLeft = (z + 1) * WIDTH + x;
      const bottomRight = (z + 1) * WIDTH + x + 1;

      indices[index++] = topLeft;
      indices[index++] = bottomLeft;
      indices[index++] = topRight;
      indices[index++] = topRight;
      indices[index++] = bottomLeft;
      indices[index++] = bottomRight;
    }
  }
  return { vertices, indices };
};

const OnConnection = (io: Server, socket: Socket) => {
  console.log(`[SOCKET] Connected ID: ${socket.id}`);
  socket.on('disconnect', () =>
    console.log(`[SOCKET] Disconnected: ${socket.id}`),
  );

  socket.on(
    SOCKET_EVENTS.REQUEST_ADD_BUILDING,
    ({ playerId, roomId, buildingType, position }: RequestAddBuilding) => {
      console.log(
        `[SOCKET] Request to add ${buildingType} in room "${roomId}"`,
      );
      // not sure how to know what room the player is calling from??? TODO
      // console.log(`Rooms${inspect(room, false, null, true)}`);

      const room = rooms[roomId];
      if (!room) {
        console.error(`[SOCKET] Room ${roomId} not found`);
        return;
      }

      // console.log(`room : ${inspect(room.players, false, null, true)}`);

      const player = room.players.find(player => player.playerId === playerId);
      if (!player) {
        console.error(`[SOCKET] Player ${player} not found`);
        return;
      }
      const buildingInstance: BuildingInstance = {
        buildingType,
        cutback: 0,
        position,
      };
      const society = room.players.find(
        player => player.playerId === playerId,
      )!.society;

      society.buildings.push(buildingInstance);
      io.to(roomId).emit(SOCKET_EVENTS.SERVER_ADDED_BUILDING, {
        playerId,
        buildingInstance,
      } as ServerAddedBuilding);
    },
  );

  socket.on(
    SOCKET_EVENTS.REQUEST_JOIN_ROOM,
    ({ roomId, displayName }: RequestJoinRoom) => {
      console.log(
        `[SOCKET] Request to join room: ${roomId} as ${displayName}`,
      );

      const newSociety: Society = {
        societyId: uuidv4(),
        color: getRandomColor(),
        buildings: [],
      };
      const newPlayer: Player = {
        playerId: uuidv4(),
        displayName: displayName,
        society: newSociety,
      };
      if (rooms[roomId]) {
        console.log(
          `[SOCKET] Room ${roomId} found. Adding Player with name ${displayName}`,
        );
        rooms[roomId].players.push(newPlayer);
      } else {
        console.log(`[SOCKET] Room ${roomId} does not exist, creating`);
        rooms[roomId] = {
          roomId,
          players: [newPlayer],
          mapGeometry: generateMapFromHeightMap(generateHeightMap()),
        };
      }

      try {
        socket.join(roomId);
        console.log(`[SOCKET] ${displayName} joined room ${roomId}`);

        // Emit an event back to the client with room and player information
        socket.emit(SOCKET_EVENTS.ROOM_JOINED, {
          playerId: newPlayer.playerId,
          roomState: rooms[roomId],
        } as JoinRoom);

        // Notify other players in the room // TODO make this specific to the player and emit another event to others players re: new player joining
        socket.to(roomId).emit(SOCKET_EVENTS.NEW_PLAYER_JOINED_ROOM, {
          player: newPlayer,
        } as ServerPlayerJoined);
      } catch (error) {
        console.error(`[SOCKET] Error joining room: ${error}`);
        socket.emit(SOCKET_EVENTS.ROOM_JOIN_ERROR, 'Failed to join room');
      }
    },
  );
};

io.on('connection', socket => {
  OnConnection(io, socket);
});
