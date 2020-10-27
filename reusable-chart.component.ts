import { Component, OnInit, ElementRef, ChangeDetectorRef, Input, ViewChild, Output, EventEmitter, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { ReusableChartDrawComponent } from './reusable-chart-draw-chart';
import { ReusableChartService } from './reusable-chart.service';
import { IBasicChartConfig, ITextDimensions, IImageDimensions } from './IReusableChart';
import { DialogService } from '@progress/kendo-angular-dialog';
@Component({
  selector: 'app-reusable-chart',
  templateUrl: './reusable-chart.component.html',
  styleUrls: ['./reusable-chart.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ReusableChartComponent implements OnInit, OnChanges {

  @Input() treeChartData: any;
  @Input() treeConfig: IBasicChartConfig;
  @Input() textDimensions: any;
  @Input() imageDimensions: any;
  @Input() chartSearchNode: string | number;
  @Input() reCenterTree: boolean;
  @Input() centerNodes: any;
  @Input() toggleView: any;
  @Input() levelSelected: any;
  @Input() hoveredArray: any;

  @Output() doubleClickedNode: EventEmitter<string> = new EventEmitter<string>();
  @Output() showToolTip:  EventEmitter<any> = new EventEmitter<any>();
  @Output() hideToolTip:  EventEmitter<any> = new EventEmitter<any>();
  @Output() dragAndDropNode: EventEmitter<any> = new EventEmitter<any>();
  @Output() totalTreeLevels: EventEmitter<any> = new EventEmitter<any>();


  public showUpperArrow: boolean = false;
  public hoveredNode: any;
  public isOpenSidePane: boolean = false;
  public positionDetails;
  public data: any;
  public getToggle: any;
  public dragAndDropEnabled: boolean;
  public searchPositionValue: string;
  public isCentered: boolean = false;
  private chart: ReusableChartDrawComponent;

  constructor(
    private chartSvc: ReusableChartService,
    private dialogSvc: DialogService
  ) {
  }
  ngOnInit() {

    this.settingUpChartData();
    this.onClickShowSidePane();
    this.showTooltip();
    this.hideTooltip();
    this.dragAndDrop();
  }
  ngOnChanges(changes: SimpleChanges) { 
    console.log(changes);
    if (changes?.centerNodes?.currentValue && changes?.centerNodes?.currentValue !== '') {
      this.isCentered = true;
    }
    if (changes?.centerNodes?.currentValue === '' ) {
      this.recentreTreeChart();
    } 
    if (changes?.chartSearchNode?.currentValue || changes?.chartSearchNode?.currentValue === '') {
      this.searchNode(this.chartSearchNode)
    } 
    if (changes?.reCenterTree?.currentValue) {
      this.recentreTreeChart()
    }
    if (changes?.hoveredArray?.currentValue) {
      this.expandTreeToLevel(changes?.hoveredArray?.currentValue);
    }
    if (changes?.levelSelected?.currentValue || changes?.levelSelected?.currentValue === null) {
      this.formatTreeDepth(this.levelSelected)
    }
    if (changes?.treeChartData?.currentValue) {
      this.updateChart();
    }
     if (changes?.toggleView?.currentValue) {
      this.getToggle = changes?.toggleView?.currentValue;
      this.isCentered = false;
      this.updateChart(true);
     }
  }
 public settingUpChartData(toggle?): void { 
    this.initChart();
    this.createChart();
    this.updateChart(true);
 }
 public initChart() {
   this.chart = new ReusableChartDrawComponent(this.chartSvc, this.dialogSvc, this.treeConfig, this.imageDimensions, this.textDimensions);
 }
 public createChart() {
   if (this.chart) {
    this.treeChartData = this.stripChildrenProps(this.treeChartData);
     this.treeChartData = this.createTreeStucture(this.treeChartData);
     this.chart.createTree(this.treeChartData);
   }
 }
 public updateChart(isCenter?: boolean) { 
   if (this.chart) { 
     if (isCenter) {
        this.chart.update(this.treeChartData, isCenter, this.getToggle );
      } else {
      this.chart.update(this.chartSvc.masterRoot, false, this.getToggle);
    }
  if (this.isCentered) {
    if (Array.isArray(this.centerNodes)) {
      if (this.centerNodes.length > 0) {
        this.chart.nodeHighlight(this.centerNodes[ Math.floor(this.centerNodes.length / 2)][this.treeConfig.uniqueKey]);
        }
    } else {
    this.chart.nodeHighlight(this.centerNodes[this.treeConfig.uniqueKey]);
    }
  }
  if (this.treeConfig.id === 'tree-chart') {
    this.getLevelsInTree();
  }    
    }
}
// emit a position from the parent component to highlight the color.
public searchNode(positionId) {
  if (this.chart) {
       this.chart.searchNode(positionId);
     }
  }

public onClickShowSidePane() {
this.chartSvc.nodeDblClicked.subscribe(positionId => {
    this.doubleClickedNode.emit(positionId);
  })
}
public showTooltip() {
  this.chartSvc.showToolTip.subscribe(data => {
    this.showToolTip.emit(data)
  })
}
public hideTooltip() {
  this.chartSvc.hideTooltip.subscribe(data => {
    this.hideToolTip.emit(data);
  })
}
public dragAndDrop() {
  this.chartSvc.dragAndDropNodes.subscribe(data => {
  this.dragAndDropNode.emit(data);
  })
}
  public recentreTreeChart() {
    this.chart.centerTree();

  }
public centerNode(data) {
  if (this.chart) {
    this.chart.centerNode(data);
}
}
private createTreeStucture(positions: object): object[] {
  const parentKey = this.treeConfig.uniqueParentKey;
  const roots: any[] = [];
  Object.keys(positions).forEach(positionId => {

    const position = positions[positionId];
    const parent = positions[position[parentKey]];
    if (parent) {
      parent.children ? parent.children.push(position) : parent['children'] = [position];
    } else {
      roots.push(position);
    }
  });
  return roots;
}
private stripChildrenProps(positions: Object): object {
  Object.keys(positions).forEach(positionId => {
    if (positions[positionId].children) {
      positions[positionId].children = null;
    }
  });
  return positions;
}
public expandTreeToLevel(hoveredArray) {
  if (this.chart) {
   hoveredArray.forEach(position => this.chart.expandTreeToLevel(1, position));
  }
  if (hoveredArray && hoveredArray.length > 0) {
  this.chart.nodeHighlight(hoveredArray[ Math.floor(hoveredArray.length / 2)][this.treeConfig.uniqueKey]);
  }
}
public getLevelsInTree() {
 const depth = this.findDepth(this.chartSvc.masterRoot);
  const leveldepth =  Array.from(new Array(depth), (val, index) => index + 1).map((level: number) => {
    return {'text': `Level ${level}`, 'value': level};
  });
  this.totalTreeLevels.emit(leveldepth);
}
private findDepth(d: any): number {
  if (d === null || d === undefined) {
    return 0;
  }

  let h = 0;
  const children = d.children || d._children;
  if (children && children.length > 0) {
    for (let i = 0; i < children.length; i++) {
      h = Math.max(h, this.findDepth(children[i]));
      if (h > 3) {
        return h = 3;
      }
    }
  }
  return d.positionId.toUpperCase() === 'MASTER ROOT' ? h : h + 1;
}
public formatTreeDepth(level) {
  if (this.chart) {
    this.chart.formatTreeDepth(level);
    }
  }
}
