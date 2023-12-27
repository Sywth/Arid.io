import { OrbitControls, useKeyboardControls } from '@react-three/drei';
import { MeshProps, ThreeEvent, useFrame } from '@react-three/fiber';
import {
  MapGeometry,
  ServerAddedBuilding,
  SOCKET_EVENTS,
  RequestAddBuilding,
  BuildingType,
  Vector3 as ServerVector3,
} from '@shared/sharedTypes';
import { useEffect, useRef, useState } from 'react';
import {
  Vector3,
  Euler,
  BufferGeometry,
  PointLight,
  Scene,
  Mesh,
  BoxGeometry,
  MeshStandardMaterial,
} from 'three';
import { generateUUID } from 'three/src/math/MathUtils.js';
import { useGameContext } from '../hooks/LocalGameState';
import { useSocket } from '../hooks/Socket';
import { ClientModifications, Controls } from 'src/types';

type MapMeshProps = { mapGeometry: MapGeometry } & MeshProps;
const MapMesh = ({ mapGeometry, ...props }: MapMeshProps) => {
  const vertices: Float32Array = new Float32Array(mapGeometry.vertices);
  const indices: Uint16Array = new Uint16Array(mapGeometry.indices);

  const geometryRef = useRef<BufferGeometry>(null!);
  useEffect(() => {
    geometryRef.current.computeVertexNormals();
  }, []);

  return (
    <mesh receiveShadow={true} castShadow={true} {...props}>
      <bufferGeometry attach="geometry" ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          count={vertices.length / 3}
          array={vertices}
          itemSize={3}
        />
        <bufferAttribute
          attach="index"
          count={indices.length}
          array={indices}
          itemSize={1}
        />
      </bufferGeometry>
      <meshStandardMaterial
        attach="material"
        color={0x819852}
        flatShading={true}
        wireframe={true}
      />
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

const SunLighting = () => {
  const MAX_SIDE_LENGTH = 75;
  const SPEED = 0.75;
  const lightRef = useRef<PointLight | null>(null);
  useFrame(({ clock }) => {
    if (!lightRef.current) return;

    const r = MAX_SIDE_LENGTH / 2;
    const newPosition = new Vector3(
      Math.cos(clock.elapsedTime * SPEED) * r + r,
      15,
      Math.sin(clock.elapsedTime * SPEED) * r + r,
    );
    lightRef.current.position.lerp(newPosition, 0.1);
  });

  return <pointLight position={[0, 0, 0]} intensity={750} ref={lightRef} />;
};

// type DrawClientModificationsProps = {
//   clientModifications: ClientModifications;
// };
// const DrawClientModifications = ({
//   clientModifications,
// }: DrawClientModificationsProps) => {
//   const { ghostBuilding } = clientModifications;
//   console.log('Rendered draw client modifications ', clientModifications);

//   return (
//     <>
//       <mesh
//         key={generateUUID()}
//         receiveShadow={true}
//         castShadow={true}
//         position={ghostBuilding.position}
//         rotation={ghostBuilding.rotation}
//       >
//         <boxGeometry />
//         <meshStandardMaterial color={ghostBuilding.color} />
//       </mesh>

//     </>
//   );
// };

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

  // const [clientModifications, setClientModifications] =
  //   useState<ClientModifications>({ ghostBuilding: null });

  // const [_, get] = useKeyboardControls<Controls>();

  // const ghostBuildingRef = useRef<Mesh | null>(null);
  // const handleMouseMove = (e: ThreeEvent<MouseEvent>) => {
  //   if (get().engaged === false) {
  //     if (ghostBuildingRef !== null) {
  //       ghostBuildingRef.current = null;
  //     }
  //   }

  //   const mousePosition = e.point;

  //   if (ghostBuildingRef.current === null) {
  //     ghostBuildingRef.current = new Mesh(
  //       new BoxGeometry(1, 1, 1),
  //       new MeshStandardMaterial({ color: '#ffffff' }),
  //     );

  //     const newClientModifications: ClientModifications = {
  //       ...clientModifications,
  //       ghostBuilding: {
  //         ref: ghostBuildingRef,
  //       },
  //     };

  //     setClientModifications(newClientModifications);
  //   } else if (ghostBuildingRef.current !== null) {
  //     console.log('Ghost building ref ', ghostBuildingRef.current.position);
  //     ghostBuildingRef.current!.position.copy(mousePosition);
  //   }
  // };

  return (
    <>
      <MapMesh
        mapGeometry={mapGeometry}
        onClick={handleClick}
        // onPointerMove={handleMouseMove}
      />
      <DrawRenderModifications />
      {/* <DrawClientModifications clientModifications={clientModifications} /> */}
      <OrbitControls />
      <ambientLight intensity={1} />
      {/* <SunLighting /> */}
    </>
  );
};

export type { RenderGameboardProps };
export default RenderGameboard;
