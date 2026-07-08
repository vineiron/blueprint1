// Minimal ambient types for the bundled ELK entry point.
// elkjs ships its own types under "elkjs", but the single-file bundle path
// ("elkjs/lib/elk.bundled.js") used for the browser is untyped. We only model
// the subset of the API the ERD layout uses.
declare module "elkjs/lib/elk.bundled.js" {
  export interface ElkPoint {
    x: number;
    y: number;
  }

  export interface ElkEdgeSection {
    startPoint: ElkPoint;
    endPoint: ElkPoint;
    bendPoints?: ElkPoint[];
  }

  export interface ElkPort {
    id: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    layoutOptions?: Record<string, string>;
  }

  export interface ElkExtendedEdge {
    id: string;
    sources: string[];
    targets: string[];
    sections?: ElkEdgeSection[];
  }

  export interface ElkNode {
    id: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    children?: ElkNode[];
    edges?: ElkExtendedEdge[];
    ports?: ElkPort[];
    layoutOptions?: Record<string, string>;
  }

  export interface ElkLayoutArguments {
    layoutOptions?: Record<string, string>;
  }

  export interface ElkConstructorArguments {
    workerUrl?: string;
    workerFactory?: (url?: string) => unknown;
  }

  export default class ELK {
    constructor(options?: ElkConstructorArguments);
    layout(graph: ElkNode, args?: ElkLayoutArguments): Promise<ElkNode>;
  }
}
