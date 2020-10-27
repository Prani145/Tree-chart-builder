export interface IBasicChartConfig {
  uniqueKey: string;
  uniqueParentKey: string;
  nodeDimensions: number[];
  height: number;
  width: number;
  class: string;
  id: string;
  isCountedRootNode: boolean;
  dragAndDrop?: boolean;
}

export interface IImageDimensions {
  nodeImageHeight: string | number,
  nodeImageWidth: string | number,
  nodeImageCoordinateX: string | number,
  nodeImageCoordinateY: string | number,
  nodeStackImageCoordinateX: string | number,
  nodeStackImageCoordinateY: string | number,
  nodeChildrenImageHeight: string | number,
  nodeChildrenImageWidth: string | number,
  nodeStackImageFlipCoordinateX?: string | number,
  nodeStackImageFlipCoordinateY?: string | number,
  NodeOpacity?: string | number,
  textOpacity: string | number,
  nodeColor?: string,
  nodeChildrenStackColor?: string,
  nodeChildrenFlipStackColor?: string,
  nodeImage?: string
}

export interface ITextDimensions {
  textFields: string[],
  textPositionCoordinateX: string | number,
  textPositionCoordinateY: string | number,
  IdDisplayFlipCoordinateY?: number | string,
  TitleDisplayFlipCoordinateY?: number | string,
  IdDisplayCoordinateY?: string | number,
  TitleDisplayCoordinateY?: string | number,
  ReportCountDisplayCoordinate?: string | number
}
