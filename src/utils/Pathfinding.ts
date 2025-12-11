
export interface Point {
  x: number;
  y: number;
}

/**
 * A basic A* Pathfinding implementation for a grid.
 * @param start Starting coordinates
 * @param end Target coordinates
 * @param obstacles Set of strings "x,y" representing blocked cells
 * @param bounds Optional bounds for the grid {minX, maxX, minY, maxY}
 * @returns Array of points representing the path (excluding start, including end), or empty if no path.
 */
export function findPath(
  start: Point,
  end: Point,
  obstacles: Set<string>,
  bounds?: { minX: number; maxX: number; minY: number; maxY: number }
): Point[] {
  const startKey = `${Math.round(start.x)},${Math.round(start.y)}`;
  const endKey = `${Math.round(end.x)},${Math.round(end.y)}`;

  if (obstacles.has(endKey)) return []; // Target is blocked
  if (startKey === endKey) return [];

  const openSet: Point[] = [start];
  const cameFrom = new Map<string, string>();

  const gScore = new Map<string, number>();
  gScore.set(startKey, 0);

  const fScore = new Map<string, number>();
  fScore.set(startKey, heuristic(start, end));

  const openSetHash = new Set<string>();
  openSetHash.add(startKey);

  while (openSet.length > 0) {
    // Sort by fScore (lowest first) - simplified priority queue
    openSet.sort((a, b) => {
        const keyA = `${a.x},${a.y}`;
        const keyB = `${b.x},${b.y}`;
        return (fScore.get(keyA) ?? Infinity) - (fScore.get(keyB) ?? Infinity);
    });

    const current = openSet.shift()!;
    const currentKey = `${current.x},${current.y}`;
    openSetHash.delete(currentKey);

    if (currentKey === endKey) {
        return reconstructPath(cameFrom, current);
    }

    const neighbors = getNeighbors(current, bounds);
    for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (obstacles.has(neighborKey)) continue;

        const tentativeGScore = (gScore.get(currentKey) ?? Infinity) + 1;

        if (tentativeGScore < (gScore.get(neighborKey) ?? Infinity)) {
            cameFrom.set(neighborKey, currentKey);
            gScore.set(neighborKey, tentativeGScore);
            fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, end));

            if (!openSetHash.has(neighborKey)) {
                openSet.push(neighbor);
                openSetHash.add(neighborKey);
            }
        }
    }
  }

  return []; // No path found
}

function heuristic(a: Point, b: Point): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getNeighbors(p: Point, bounds?: { minX: number; maxX: number; minY: number; maxY: number }): Point[] {
    const neighbors = [
        { x: p.x + 1, y: p.y },
        { x: p.x - 1, y: p.y },
        { x: p.x, y: p.y + 1 },
        { x: p.x, y: p.y - 1 }
    ];

    if (bounds) {
        return neighbors.filter(n =>
            n.x >= bounds.minX && n.x <= bounds.maxX &&
            n.y >= bounds.minY && n.y <= bounds.maxY
        );
    }
    return neighbors;
}

function reconstructPath(cameFrom: Map<string, string>, current: Point): Point[] {
    const totalPath: Point[] = [current];
    let currKey = `${current.x},${current.y}`;
    while (cameFrom.has(currKey)) {
        const prevKey = cameFrom.get(currKey)!;
        const [x, y] = prevKey.split(',').map(Number);
        totalPath.unshift({ x, y });
        currKey = prevKey;
    }
    // Remove start
    totalPath.shift();
    return totalPath;
}
