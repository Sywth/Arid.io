import { BuildingType } from '@shared/sharedTypes';
import React from 'react';
import { Vector3, Euler, Mesh } from 'three';

enum Controls {
  engaged = 'engaged',
}

type RenderBuildingData = {
  buildingsType: BuildingType;
  position: Vector3;
  rotation: Euler;
  color: string;
};

type RenderModifications = {
  buildings: RenderBuildingData[];
};

type RenderGhostBuildingData = {
  ref: React.MutableRefObject<Mesh | null>;
};
type ClientModifications = {
  ghostBuilding: RenderGhostBuildingData | null;
};

export type { ClientModifications, RenderModifications, RenderBuildingData };
export { Controls };
