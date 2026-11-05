import type { CoordKey } from '../game/coords'
import { parseCoordKey } from '../game/coords'
import type { Route } from '../game/routes'
import { coordToWorld, TILE_SIZE } from './layout'
import type { Departure, Model, Prop } from './props'
import type { Edges } from './roadPieces'
import { distanceToRoad, ROAD_HALF_WIDTH, roadCells, roadStarts } from './roadPieces'

/** How long before a road cell's stones start its props in the way start to leave. */
const CLEARING_LEAD = 0.22
/** How much later than that each prop may go, so they don't all go at once. */
const CLEARING_SPREAD = 0.14
/** Share of a prop's footprint that may reach over the road's edge. */
const OVERHANG = 0.2

/** Whether a road runs under `prop`, past the edge of its footprint. */
function inTheWay(prop: Prop, roads: ReadonlyMap<string, Edges>, models: readonly Model[]) {
  const edges = roads.get(prop.cell)
  if (edges === undefined) return false
  const [cx, cz] = coordToWorld(parseCoordKey(prop.cell))
  const reach = models[prop.kind]!.radius * prop.size * (1 - OVERHANG)
  const away = distanceToRoad(edges, (prop.x - cx) / TILE_SIZE, (prop.z - cz) / TILE_SIZE)
  return away < ROAD_HALF_WIDTH + reach / TILE_SIZE
}

/** The props no road runs under: roads can cross red and yellow squares, and clear their way. */
export function clearOfRoads(
  props: readonly Prop[],
  routes: readonly Route[],
  models: readonly Model[],
): Prop[] {
  const roads = new Map(roadCells(routes).map((cell) => [cell.key as string, cell.edges]))
  return props.filter((prop) => !inTheWay(prop, roads, models))
}

/**
 * A prop a new road has cleared leaves a moment before the road's stones start to appear on its
 * cell, each a little after the last, so they go just ahead of the road.
 */
export const roadDeparture: Departure = (prop, now) => {
  const start = roadStarts.get(prop.cell as CoordKey)
  if (start === undefined || start < now - 1) return undefined
  const spread = (((prop.x * 71.3 + prop.z * 37.9) % 1) + 1) % 1
  return start - CLEARING_LEAD + spread * CLEARING_SPREAD
}
