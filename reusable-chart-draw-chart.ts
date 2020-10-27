import { Utilities } from 'app/shared/utilities';
import { ReusableChartService } from './reusable-chart.service';
import * as _ from 'lodash';
import { position } from '@progress/kendo-angular-grid/dist/es2015/dragdrop/common';
import { DialogService, DialogRef } from '@progress/kendo-angular-dialog';

declare const d3: any;

export class ReusableChartDrawComponent {
  private width: any;
  private duration: number = 750;
  private reCenterNode: object;
  private height: any;
  private masterRoot: any;
  private nodeDimensions: any;
  private tree: any;
  public showAlert = false;
  private clickCounter: number;
  private clickTimer: any;
  private diagonal: any;
  private node: any;
  private verticaltree: boolean = true;
  private paths: any;
  private nodeEnter: any;
  public searchPositionValue: string;
  private nodeUpdate: any;
  private nodeExit: any;
  private root: any;
  private baseSvg: any;
  private abaseSvg: any;
  private baseSvg2: any;

  private links: any;
  private link: any;
  private svgGroup: any;
  private svgGroup2: any;
 private zoomListener: any;
  private nodes: any;
  private clickBool: boolean = false;
  private draggingNode = null;
  private panSpeed = 200;
  private panBoundary = 20;
  private dragListener: any;
  private dragStarted;
  private panTimer;
  private domNode;
  private selectedNode;
  private configValues: any;
  public imageDimensions: any;
  public textDimensions: any;
  public defaultNodeRadius: number = 14;

  constructor(
    private chartSvc: ReusableChartService,
    private dialogSvc: DialogService,
    configValue,
    imageDimensions,
    textDimensions,
  ) {
    this.nodeDimensions = configValue.nodeDimensions;
    this.configValues = configValue;
    this.imageDimensions = imageDimensions;
    this.textDimensions = textDimensions;
  }

  public createTree(data) {
    const self = this;
    d3.select('svg.' + self.configValues.class).remove();
    self.width = self.configValues.width;
    self.height = self.configValues.height;
    self.zoomListener = d3.behavior
      .zoom()
      .scaleExtent([0.001, 3])
      .on('zoom', function () {
        self.zoom();
      });
    self.tree = d3.layout.tree();
    self.tree = self.tree.nodeSize(self.nodeDimensions);

    self.abaseSvg = d3
      .select('#' + self.configValues.id)
      .append('svg')
      .attr('width', self.width)
      .attr('height', self.height)
      .attr('class', self.configValues.class)
      .call(self.zoomListener)
      .on('dblclick.zoom', null)
    self.baseSvg = self.abaseSvg.append('svg')
    .attr('width', self.width / 2)
    .attr('height', self.height)
    self.baseSvg2 = self.abaseSvg.append('svg')
    .attr('width', self.width / 2)
    .attr('height', self.height)
    .attr('x', self.width / 2)
    
    self.svgGroup= self.baseSvg.append('g').attr('class', self.configValues.class);
    self.svgGroup2 = self.baseSvg2.append('g').attr('class', self.configValues.class);


    self.root = {
      children: data,
    };
    self.root[self.configValues.uniqueKey] = 'Master Root';
    self.masterRoot = self.root;

    self.root.x0 = self.height / 2;
    self.root.y0 = 0;
    self.chartSvc.masterRoot = self.root;
    self.root.children.forEach(function (child) {
      if (child.children) {
        child.children.forEach(collapse);
      }
    });

    function collapse(d) {
      if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
      }
    }
  }

  update(source, iscenter?, toggle?) {
    const self = this;
    self.diagonal = d3.svg.diagonal().projection(function (d) {
      return [d.y, d.x];
    });
   if (toggle === 'vertical') {
     this.verticaltree = true;
   }
   if (toggle === 'horizontal') {
    this.verticaltree = false;
  }

    if (!this.clickBool) {
      source = self.root;
    }
    const levelWidth = [1];
    const childCount = function (level, n) {
      if (n.children && n.children.length > 0) {
        if (levelWidth.length <= level + 1) {
          levelWidth.push(0);
        }

        levelWidth[level + 1] += n.children.length;
        n.children.forEach(function (d) {
          childCount(level + 1, d);
        });
      }
    };
    childCount(0, self.root);
    self.nodes = self.tree.nodes(self.root); // .reverse();
    self.nodes.forEach(function (d) {
      if (self.verticaltree) {
        d.y = d.depth * 100;
      } else {
        d.y = d.depth * 180;
      }
    });
    self.node = self.svgGroup
      .selectAll('g.node')
      .data(self.nodes, function (d) {
        return d.id || (d.id = d[self.configValues.uniqueKey]);
        // }
      });
    const updateTempConnector = function () {
      const lines = d3.svg
        .line()
        .x(function (point) {
          return point.lx;
        })
        .y(function (point) {
          return point.ly;
        });

      function lineDataTempConnector(d) {
        const points = [
          { lx: d.source.x, ly: d.source.y },
          { lx: d.target.x, ly: d.target.y },
        ];
        return lines(points);
      }

      let data = [];
      if (self.draggingNode && self.selectedNode) {
        if (self.verticaltree) {
          data = [
            {
              source: {
                x: self.selectedNode.x0,
                y: self.selectedNode.y0,
              },
              target: {
                x: self.draggingNode.x0,
                y: self.draggingNode.y0,
              },
            },
          ];
        } else {
        data = [
          {
            source: {
              x: self.selectedNode.y0,
              y: self.selectedNode.x0,
            },
            target: {
              x: self.draggingNode.y0,
              y: self.draggingNode.x0,
            },
          },
        ];
      }
    }
      const link = self.svgGroup.selectAll('.templink').data(data);

      link
        .enter()
        .append('path')
        .attr('class', 'templink')
        .attr('d', lineDataTempConnector)
        .attr('pointer-events', 'none');

      link.attr('d', lineDataTempConnector);

      link.exit().remove();
    };
    const dragListener = d3.behavior
      .drag()
      .on('dragstart', function (d) {
        if (d === self.root) {
          return;
        }
        self.chartSvc.hideTooltip.next(true);
        self.draggingNode = d;
        self.dragStarted = true;
        self.nodes = self.tree.nodes(d);
        d3.event.sourceEvent.stopPropagation();
      })
      .on('drag', function (d) {
        if (d === self.root) {
          return;
        }
        self.chartSvc.hideTooltip.next();
        if (self.dragStarted) {
          self.domNode = this;
          self.initiateDrag(d, self.domNode);
          console.log(d);
          console.log(self.domNode);
        }
        const divs = $('svg');
   console.log(divs);
        const relCoords = d3.mouse(divs.get(0));
        if (relCoords[0] < self.panBoundary) {
          self.panTimer = true;
          self.pan(this, 'left');
        } else if (relCoords[0] > divs.width() - self.panBoundary) {
          self.panTimer = true;
          self.pan(this, 'right');
        } else if (relCoords[1] < self.panBoundary) {
          self.panTimer = true;
          self.pan(this, 'up');
        } else if (relCoords[1] > divs.height() - self.panBoundary) {
          self.panTimer = true;
          self.pan(this, 'down');
        } else {
          try {
            clearTimeout(self.panTimer);
          } catch (e) {}
        }
        if (self.verticaltree) {
          d.x0 += d3.event.dx;
          d.y0 += d3.event.dy;
          const node = d3.select(this);
          node.attr('transform', 'translate(' + d.x0 + ',' + d.y0 + ')');
          updateTempConnector();       
         } else {
          d.x0 += d3.event.dy;
          d.y0 += d3.event.dx;
          const node = d3.select(this);
          node.attr('transform', 'translate(' + d.y0 + ',' + d.x0 + ')');
          updateTempConnector();        }
      })
      .on('dragend', function (d) {
        if (d === self.root) {
          return;
        }
        self.domNode = this;
        if (self.selectedNode) {
          self.chartSvc.dragAndDropNodes.next([
            self.draggingNode,
            self.selectedNode,
          ]);
          self.expand(self.selectedNode);
          endDrag();
        }
        endDrag();
      });

    function endDrag() {
      self.selectedNode = null;
      d3.selectAll('.ghostCircle').attr('class', 'ghostCircle');
      d3.select(self.domNode).attr('class', 'node');
      d3.select(self.domNode).select('.ghostCircle').attr('pointer-events', '');
      updateTempConnector();
      if (self.draggingNode !== null) {
        self.update(self.root);
        self.draggingNode = null;
      }
      clearTimeout(self.panTimer);
    }

    const overCircle = function (d) {
      self.selectedNode = d;
      updateTempConnector();
    };
    const outCircle = function (d) {
      self.selectedNode = null;
      updateTempConnector();
    };
    if (self.configValues.dragAndDrop) {
      self.nodeEnter = self.node
        .enter()
        .append('g')
        .call(dragListener)
        .attr('width', self.width)
        .attr('height', self.height)
        .attr('class', 'node ' + self.configValues.class)
        .attr('transform', function (d) {
          if (self.verticaltree) {
            return 'translate(' + source.x0 + ',' + source.y0 + ')';
          } else {
          return 'translate(' + source.y0 + ',' + source.x0 + ')';
          }
        })
        .attr('display', function (d) {
          return d.depth === 0 ? 'none' : 'null';
        })
        .attr('id', (d) => {
          return 'p-' + d[self.configValues.uniqueKey];
        })
        .on('mouseover', function (d) {
          if (!self.draggingNode) {
            self.chartSvc.showToolTip.next([this, d]);
            d3.event.stopPropagation();
          }
        })
        .on('mouseout', () => {
          self.chartSvc.hideTooltip.next();
        });
    } else {
      self.nodeEnter = self.node
        .enter()
        .append('g')
        .attr('width', self.width)
        .attr('height', self.height)
        .attr('class', 'node ' + self.configValues.class)
        .attr('transform', function (d) {
          if (self.verticaltree) {
            return 'translate(' + source.x0 + ',' + source.y0 + ')';
          } else {
          return 'translate(' + source.y0 + ',' + source.x0 + ')';
          }
        })
        .attr('display', function (d) {
          return d.depth === 0 ? 'none' : 'null';
        })
        .attr('id', (d) => {
          return 'p-' + d[self.configValues.uniqueKey];
        })
        .on('mouseover', function (d) {
            self.chartSvc.showToolTip.next([this, d]);
            d3.event.stopPropagation();
        })
        .on('mouseout', () => {
          self.chartSvc.hideTooltip.next();
        });
    }
    self.nodeEnter.append('circle')
    .filter(d => {
      return d.newlyDesigned
    })
    .attr('r', 35)
    .attr('x', '-5px')
    .style('fill', 'lightsteelblue')
    .transition()
    .delay(1000)
    .duration(2000)
    .style('opacity', 0);
    // append a circle for the node
    self.nodeEnter
      .append('circle')
      .attr('r', function (d) {
        return self.imageDimensions(d)['nodeRadius']
          ? self.imageDimensions(d)['nodeRadius']
          : self.defaultNodeRadius;
      })
      .attr('class', 'node-circle')
      .style('stroke-width', function (d) {
        return d.class === 'found' &&
          Utilities.trimToUppercase(d[self.configValues.uniqueKey]) ===
            Utilities.trimToUppercase(self.searchPositionValue)
          ? 2
          : 0;
      })
      .style('fill', function (d) {
        if (self.imageDimensions && self.imageDimensions(d)['nodeColor']) {
          return self.imageDimensions(d)['nodeColor'];
        } else {
          return 'none';
        }
      })
      .style('fill-opacity', function (d) {
        if (self.imageDimensions && self.imageDimensions(d)['NodeOpacity']) {
          return self.imageDimensions(d)['NodeOpacity'];
        }
      })
      .style('stroke', function (d) {
        return d.class === 'found' &&
          Utilities.trimToUppercase(d[self.configValues.uniqueKey]) ===
            Utilities.trimToUppercase(self.searchPositionValue)
          ? 'red'
          : 'none';
      });

    // append circle for node search

    self.nodeEnter.append('circle')
      .attr('r', 16)
      .attr('class', 'node-circle-radius')
    .style('stroke-width', function (d) {
      return d.class === 'found' && Utilities.trimToUppercase(d[self.configValues.uniqueKey]) === Utilities.trimToUppercase(self.searchPositionValue) ? 2 : 0;
    })
    .style('fill', 'none')
    .style('stroke', function (d) {
      return d.class === 'found' && Utilities.trimToUppercase(d[self.configValues.uniqueKey]) === Utilities.trimToUppercase(self.searchPositionValue) ? 'red' : 'none';
    })



    // adding image for representing child nodes
    self.nodeEnter
      .append('image')
      .attr('xlink:href', function (d) {
        if (d.children && (self.configValues.id !== 'org-viewer-tree-container')) {
          if (self.verticaltree) {
            return '../../../assets/images/Collapse_arrow_bottom.png';
          } else {
            return '../../../assets/images/Collapse_arrow.png';
          }
        } else if (d._children) {
          if (
            self.imageDimensions &&
            self.imageDimensions(d)['nodeChildrenStackColor'] && !self.verticaltree
          ) {
            return self.imageDimensions(d)['nodeChildrenStackColor'];
          } else if (d._children) {
            if (
              self.imageDimensions &&
              self.imageDimensions(d)['nodeChildrenFlipStackColor'] && self.verticaltree
            ) {
              return self.imageDimensions(d)['nodeChildrenFlipStackColor'];
            } else {
            return '../../../assets/images/grey-stack.png';
            }
          }
        }
      })
      .attr('height', function (d) {
        if (
          self.imageDimensions &&
          self.imageDimensions(d)['nodeChildrenImageHeight']
        ) {
          return self.imageDimensions(d)['nodeChildrenImageHeight'];
        } else {
          return '55px';
        }
      })
      .attr('width', function (d) {
        if (
          self.imageDimensions &&
          self.imageDimensions(d)['nodeChildrenImageWidth']
        ) {
          return self.imageDimensions(d)['nodeChildrenImageWidth'];
        } else {
          return '55px';
        }
      })
      .attr('x', function (d) {
        if (self.verticaltree) {
          if (
            self.imageDimensions &&
            self.imageDimensions(d)['nodeStackImageFlipCoordinateX'] && !d.children
          ) {
            return self.imageDimensions(d)['nodeStackImageFlipCoordinateX'];
          } else if  (self.imageDimensions &&
            self.imageDimensions(d)['nodeStackImageFlipCoordinateX'] && d.children) {
            return self.imageDimensions(d)['nodeStackImageFlipCoordinateX'];
          } else {
            return -27;
          }
        } else {
        if (
          self.imageDimensions &&
          self.imageDimensions(d)['nodeStackImageCoordinateX']
        ) {
          return self.imageDimensions(d)['nodeStackImageCoordinateX'];
        } else {
          return '-24px';
        }
      }
      })
      .attr('y', function (d) {
        if (self.verticaltree) {
          if (
            self.imageDimensions &&
            self.imageDimensions(d)['nodeStackImageFlipCoordinateY'] && !d.children
          ) {
            return self.imageDimensions(d)['nodeStackImageFlipCoordinateY'];
          } else if  ( self.imageDimensions &&
            self.imageDimensions(d)['nodeStackImageFlipCoordinateY'] && d.children) {
            return self.imageDimensions(d)['nodeStackImageFlipCoordinateY']
          } else {
            return -20;
          }
        } else {
        if (
          self.imageDimensions &&
          self.imageDimensions(d)['nodeStackImageCoordinateY']
        ) {
          return self.imageDimensions(d)['nodeStackImageCoordinateY'];
        } else {
          return '-30px';
        }
      }
      })
      .attr('class', 'icon')
      .on('click', function (d) {
        self.click(d);
      });

    // adding image to denote the position type
    self.nodeEnter
      .append('image')
      .attr('xlink:href', function(d) {
        if (self.imageDimensions && self.imageDimensions(d)['nodeImage']) {
          return self.imageDimensions(d)['nodeImage']
        }
        return '../../../assets/images/regular.png';
      })
      .attr('height', function (d) {
        if (
          self.imageDimensions &&
          self.imageDimensions(d)['nodeImageHeight']
        ) {
          return self.imageDimensions(d)['nodeImageHeight'];
        } else {
          return '25px';
        }
      })
      .attr('width', function (d) {
        if (self.imageDimensions && self.imageDimensions(d)['nodeImageWidth']) {
          return self.imageDimensions(d)['nodeImageWidth'];
        } else {
          return '25px';
        }
      })
      .attr('x', function (d) {
        if (
          self.imageDimensions &&
          self.imageDimensions(d)['nodeImageCoordinateX']
        ) {
          return self.imageDimensions(d)['nodeImageCoordinateX'];
        } else {
          return '-15px';
        }
      })
      .attr('y', function (d) {
        if (
          self.imageDimensions &&
          self.imageDimensions(d)['nodeImageCoordinateY']
        ) {
          return self.imageDimensions(d)['nodeImageCoordinateY'];
        } else {
          return '-15px';
        }
      })
      .attr('class', 'node')
      .on('mousemove', function (d) {
        '';
      })
      .on('dblclick', (d) => {
        self.chartSvc.nodeDblClicked.next(d[self.configValues.uniqueKey]);
      });

    // adding image to denote the position status
    self.nodeEnter
      .append('image')
      .attr('xlink:href', function(d) {
        if (self.imageDimensions && self.imageDimensions(d)['nodeImageSub']) {
          return self.imageDimensions(d)['nodeImageSub']
        }
      })
      .attr('height', function (d) {
        if (
          self.imageDimensions &&
          self.imageDimensions(d)['nodeImageSubHeight']
        ) {
          return self.imageDimensions(d)['nodeImageSubHeight'];
        }
      })
      .attr('width', function (d) {
        if (self.imageDimensions && self.imageDimensions(d)['nodeImageSubWidth']) {
          return self.imageDimensions(d)['nodeImageSubWidth'];
        }
      })
      .attr('x', function (d) {
        if (
          self.imageDimensions &&
          self.imageDimensions(d)['nodeImageSubCoordinateX']
        ) {
          return self.imageDimensions(d)['nodeImageSubCoordinateX'];
        }
      })
      .attr('y', function (d) {
        if (
          self.imageDimensions &&
          self.imageDimensions(d)['nodeImageSubCoordinateY']
        ) {
          return self.imageDimensions(d)['nodeImageSubCoordinateY'];
        }
      })
      .attr('class', 'subNode')
      .on('mousemove', function (d) {
        '';
      })
      .style('opacity', function (d) {
        if (self.imageDimensions && self.imageDimensions(d)['subNodeOpacity']) {
          return self.imageDimensions(d)['subNodeOpacity'];
        }
      });
    // appending text to be displayed below the nodes
   if (self.configValues.id === 'org-viewer-tree-container') {
     const textBackground = self.nodeEnter.append('rect')
       .filter(d => {
         return self.childCounter(d) > 0;
       })
       .attr('x', function(d) {
         if (self.verticaltree) {
           return -12.5
         } else {
           return 16.5
         }
       })
       .attr('y', function(d) {
        if (self.verticaltree) {
          return 16
        } else {
          return -6
        }
      })
       .attr('width', d => {
         const count = self.childCounter(d);
         const sigFigs = Math.floor(Math.log(count) * Math.LOG10E);
         if (self.verticaltree) {
          if (!d.children && !d._children) {
            return 0
          } else {
          return 25
          }
         } else {
          if (!d.children && !d._children) {
            return 0
          } else {
         switch (sigFigs) {
           case 0:
             return 12;
           case 1:
             return 18;
           case 2:
             return 22;
           default:
             return 25;
         }
        }
      }
       })
       .attr('height', 12)
       .attr('rx', 6)
       .attr('ry', 6)
       .attr('fill', '#898989')
       .on('click', function (d) {
         self.click(d);
       });

     const childCountText = self.nodeEnter.append('text')
       .filter(d => {
         return self.childCounter(d) > 0;
       })
       .attr('x', function(d) {
        if (self.verticaltree) {
          return -10
        } else {
          return 19
        }
      })
      .attr('y', function(d) {
       if (self.verticaltree) {
         return 25
       } else {
         return 3
       }
     })
       .attr('text-anchor', 'start')
       .attr('font-size', '22px')
       .on('click', function (d) {
         self.click(d);
       })
       .text(d => {
         const count = self.childCounter(d);
         const sigFigs = Math.floor(Math.log(count) * Math.LOG10E);
         switch (sigFigs) {
           case 0:
           case 1:
           case 2:
             return count.toLocaleString();
           case 3:
           case 4:
             return (count / 1000).toPrecision(2) + 'k';
           case 5:
             return (count / 1000).toPrecision(3) + 'k';
           case 6:
           case 7:
             return (count / 100000).toPrecision(2) + 'm';
           case 8:
             return (count / 100000).toPrecision(3) + 'm';
         }
       })
       .style('fill', 'white')
       .attr('stoke', 'none');

   }
     const textElement = self.nodeEnter
       .append('text')
       .attr('x', function (d) {
         if (
           self.textDimensions &&
           self.textDimensions.textPositionCoordinateX
         ) {
           return self.textDimensions.textPositionCoordinateX;
         } else {
           return '';
         }
       })
       .attr('dy', function (d) {
         if (
           self.textDimensions &&
           self.textDimensions.textPositionCoordinateY
         ) {
           return self.textDimensions.textPositionCoordinateY;
         } else {
           return '';
         }
       })
       .attr('text-anchor', function (d) {
         return d.children || d._children ? 'middle' : 'middle';
       })
       .style('fill-opacity', function (d) {
         if (self.imageDimensions && self.imageDimensions(d)['textOpacity']) {
           return self.imageDimensions(d)['textOpacity'];
         } else {
           return 8;
         }
       }).on('click', function (d) {
         self.click(d);
       });
     if (self.textDimensions && self.textDimensions.textFields && self.configValues.id !== 'tree-chart') {
       self.textDimensions.textFields.forEach(function (textValue) {
         textElement
           .append('tspan')
           .text((d) => {
             if (d[textValue] != null) {
               if (self.verticaltree) {
               
                  return self.truncate_string(d[textValue], 12, '...');
              } else { 
               
                  return self.truncate_string(d[textValue], 30, '...');
              }
             } else {
               return d[textValue];
             }
           })
           .attr('class', textValue)
           .attr('x', 0)
           .attr('y', function (d) {
            if (self.verticaltree) {
              if (textValue === self.configValues.uniqueKey) {
                if (!d.children && !d._children) { 
                  return self.textDimensions.IdDisplayCoordinateY;
                } else {
                  return self.textDimensions.IdDisplayFlipCoordinateY;
                }
              } else if (textValue.includes('Title') || textValue.includes('Name')) {
                if (!d.children && !d._children) {
                  return self.textDimensions.TitleDisplayCoordinateY;
                } else {
                  return self.textDimensions.TitleDisplayFlipCoordinateY;
                }
              }
            } else {
              if (textValue === self.configValues.uniqueKey) {
                return self.textDimensions.IdDisplayCoordinateY;
              } else if (textValue.includes('Title') || textValue.includes('Name')) {
                return self.textDimensions.TitleDisplayCoordinateY;
              } else {
                return '30px';
              }
            }
         })
           .style('font-family', function () {
             if (textValue === self.configValues.uniqueKey) {
               return 'robotobold';
             }
           });
       });
     } else {
       if (self.configValues.id === 'tree-chart') {
        textElement.append('tspan')
        .attr('class', 'positionId')
        .text(d => {
          if (self.verticaltree) {
          return ('(' + self.truncate_string(d.positionId, 12, '...') + ')');
          } else {
            return ('(' + self.truncate_string(d.positionId, 30, '...') + ')');
          }
        })
        .attr('x', 0)
        .attr('y', function(d) {
          if (self.verticaltree) {
          if (!d.children && !d._children) { 
            return self.textDimensions.IdDisplayCoordinateY;
          } else {
            return self.textDimensions.IdDisplayFlipCoordinateY;
          }
        } else {
          return self.textDimensions.IdDisplayCoordinateY;
        }
        })
        .style('font-family', 'robotobold');
        textElement.append('tspan')
        .attr('class', 'futurePositionTitle')
        .attr('x', 0)
        .attr('y', function(d) {
          if (self.verticaltree) {
          if (!d.children && !d._children) {
            return self.textDimensions.TitleDisplayCoordinateY;
          } else {
            return self.textDimensions.TitleDisplayFlipCoordinateY;
          }
        } else {
          return self.textDimensions.TitleDisplayCoordinateY;
        }
        })
       } else {
        textElement
        .append('tspan')
        .text((d) => {
          return '(' + d[self.configValues.uniqueKey] + ')';
        })
        .attr('x', 0)
        .attr('y', function(d) {
          if (self.verticaltree) {
            return 35;
          } else {
            return 25;
          }
        })
        .style('font-family', 'robotobold');
       }
      
     }
     if (self.configValues.id !== 'org-viewer-tree-container') {
       textElement
         .append('tspan')
         .attr('dy', function () {
           if (
             self.textDimensions &&
             self.textDimensions.ReportCountDisplayCoordinate
           ) {
             return self.textDimensions.ReportCountDisplayCoordinate;
           } else {
             return '1.3em';
           }
         })
         .attr('x', 0)
         .attr('class', 'rollCount')
         .text((d) => {
             if (self.configValues.isCountedRootNode) {
              if (d.futureNumberOfTotalReports > 0) {
                return `Reports: ${d.futureNumberOfTotalReports}(${d.futureNumberOfDirectReports})`;
               }
            } else {
            const children = d.children || d._children;
            if (children) {
              const count = self.childCounter(d, false);
              return `Reports: ${count.toLocaleString()}(${children.length})`;
            }
          }
          });
     }
    if (self.configValues.dragAndDrop) {
      self.nodeEnter
        .append('circle')
        .attr('class', 'ghostCircle')
        .attr('r', 45)
        .attr('opacity', 0.2)
        .style('fill', 'red')
        .attr('pointer-events', 'mouseover')
        .on('mouseover', function (nd) {
          overCircle(nd);
        })
        .on('mouseout', function (nd) {
          outCircle(nd);
        });
    }
    self.nodeUpdate = self.node
      .transition()
      .duration(self.duration)
      .attr('transform', function (d) {
        if (self.verticaltree) {
          return 'translate(' + d.x + ',' + d.y + ')';
        } else {
          return 'translate(' + d.y + ',' + d.x + ')';
        }
      });

    self.nodeUpdate
      .select('circle.node-circle')
      .attr('r', function (d) {
        return self.imageDimensions(d)['nodeRadius']
          ? self.imageDimensions(d)['nodeRadius']
          : self.defaultNodeRadius;
      })

      .attr('x', function (d) {
        if (
          self.imageDimensions &&
          self.imageDimensions(d)['nodeStackImageCoordinateX']
        ) {
          return self.imageDimensions(d)['nodeStackImageCoordinateX'];
        } else {
          return '-24px';
        }
      })
      .attr('y', function (d) {
        if (
          self.imageDimensions &&
          self.imageDimensions(d)['nodeStackImageCoordinateY']
        ) {
          return self.imageDimensions(d)['nodeStackImageCoordinateY'];
        } else {
          return '-30px';
        }
      })

      .style('fill', function (d) {
        if (self.imageDimensions && self.imageDimensions(d)['nodeColor']) {
          return self.imageDimensions(d)['nodeColor'];
        } else {
          return 'none';
        }
      })
      .style('fill-opacity', function (d) {
        if (self.imageDimensions && self.imageDimensions(d)['NodeOpacity']) {
          return self.imageDimensions(d)['NodeOpacity'];
        }
      })
      .style('stroke-width', function (d) {
        return d.class === 'found' &&
          Utilities.trimToUppercase(d[self.configValues.uniqueKey]) ===
            Utilities.trimToUppercase(self.searchPositionValue)
          ? 2
          : 0;
      })
      .style('stroke', function (d) {
        return d.class === 'found' &&
          Utilities.trimToUppercase(d[self.configValues.uniqueKey]) ===
            Utilities.trimToUppercase(self.searchPositionValue)
          ? 'red'
          : 'none';
      });

    self.nodeUpdate.select('text').style('fill-opacity', function (d) {
      if (self.imageDimensions && self.imageDimensions(d)['textOpacity']) {
        return self.imageDimensions(d)['textOpacity'];
      }
    });

// node cirlce red update


self.nodeUpdate.select('circle.node-circle-radius')
.attr('r', 16)
.style('stroke-width', function (d) {
  return d.class === 'found' && Utilities.trimToUppercase(d[self.configValues.uniqueKey]) === Utilities.trimToUppercase(self.searchPositionValue) ? 2 : 0;
})
.style('fill', 'none')
.style('stroke', function (d) {
  return d.class === 'found' && Utilities.trimToUppercase(d[self.configValues.uniqueKey]) === Utilities.trimToUppercase(self.searchPositionValue) ? 'red' : 'none';
});


self.nodeUpdate.select('image.node')
.attr('xlink:href', function(d) {
  if (self.imageDimensions && self.imageDimensions(d)['nodeImage']) {
    return self.imageDimensions(d)['nodeImage']
  }
  return '../../../assets/images/regular.png';

})
.attr('height', function(d) {
  if (self.imageDimensions && self.imageDimensions(d)['nodeImageHeight']) {
     return self.imageDimensions(d)['nodeImageHeight']
  } else {
    return '25px'
  }
  })
.attr('width', function(d) {
  if (self.imageDimensions && self.imageDimensions(d)['nodeImageWidth']) {
     return self.imageDimensions(d)['nodeImageWidth']
  } else {
    return '25px'
  }
  })
  .attr('x', function(d) {
    if (self.imageDimensions && self.imageDimensions(d)['nodeImageCoordinateX']) {
       return self.imageDimensions(d)['nodeImageCoordinateX']
    } else {
      return '-15px'
    }
    })
  .attr('y', function(d) {
    if (self.imageDimensions && self.imageDimensions(d)['nodeImageCoordinateY']) {
       return self.imageDimensions(d)['nodeImageCoordinateY']
    } else {
      return '-15px'
    }
    });
    if (self.configValues.id === 'org-viewer-tree-container') {
      self.nodeUpdate.select('rect')
      .attr('x', function(d) {
        if (self.verticaltree) {
          return -12.5
        } else {
          return 16.5
        }
      })
      .attr('y', function(d) {
       if (self.verticaltree) {
         return 16
       } else {
         return -6
       }
     })
      .attr('width', d => {
        const count = self.childCounter(d);
        const sigFigs = Math.floor(Math.log(count) * Math.LOG10E);
        if (self.verticaltree) {
          if (!d.children && !d._children) {
            return 0
          } else {
          return 25
          }
        } else {
          if (!d.children && !d._children) {
            return 0
          } else {
         switch (sigFigs) {
           case 0:
             return 12;
           case 1:
             return 18;
           case 2:
             return 22;
           default:
             return 25;
         }
        }
       }
      })
      .attr('height', 12)
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', '#898989')



     self.nodeUpdate.select('text')
        .attr('x', function(d) {
         if (self.verticaltree) {
           return -10
         } else {
           return 19
         }
       })
       .attr('y', function(d) {
        if (self.verticaltree) {
          return 25
        } else {
          return 3
        }
      })
        .attr('text-anchor', 'start')
        .attr('font-size', '22px')
        .text(d => {
          const count = self.childCounter(d);
          const sigFigs = Math.floor(Math.log(count) * Math.LOG10E);
          switch (sigFigs) {
            case 0:
            case 1:
            case 2:
              return count.toLocaleString();
            case 3:
            case 4:
              return (count / 1000).toPrecision(2) + 'k';
            case 5:
              return (count / 1000).toPrecision(3) + 'k';
            case 6:
            case 7:
              return (count / 100000).toPrecision(2) + 'm';
            case 8:
              return (count / 100000).toPrecision(3) + 'm';
          }
        })
        .style('fill', 'white')
        .attr('stoke', 'none');

    }

    self.nodeUpdate.select('image.subNode')
      .attr('xlink:href', function(d) {
        if (self.imageDimensions && self.imageDimensions(d)['nodeImageSub']) {
          return self.imageDimensions(d)['nodeImageSub']
        }
      })
      .attr('height', function(d) {
        if (self.imageDimensions && self.imageDimensions(d)['nodeImageSubHeight']) {
          return self.imageDimensions(d)['nodeImageSubHeight']
        }
      })
      .attr('width', function(d) {
        if (self.imageDimensions && self.imageDimensions(d)['nodeImageSubWidth']) {
          return self.imageDimensions(d)['nodeImageSubWidth']
        }
      })
      .attr('x', function(d) {
        if (self.imageDimensions && self.imageDimensions(d)['nodeImageSubCoordinateX']) {
          return self.imageDimensions(d)['nodeImageSubCoordinateX']
        }
      })
      .attr('y', function(d) {
        if (self.imageDimensions && self.imageDimensions(d)['nodeImageSubCoordinateY']) {
          return self.imageDimensions(d)['nodeImageSubCoordinateY']
        }
      })
      .style('opacity', function (d) {
        if (self.imageDimensions && self.imageDimensions(d)['subNodeOpacity']) {
          return self.imageDimensions(d)['subNodeOpacity'];
        }
      })


    self.nodeUpdate
      .select('image.icon')
      .attr('xlink:href', function (d) {
        if (d.children && (self.configValues.id !== 'org-viewer-tree-container')) {
          if (self.verticaltree) {
            return '../../../assets/images/Collapse_arrow_bottom.png';
          } else {
            return '../../../assets/images/Collapse_arrow.png';
          }
        } else if (d._children) {
          if (
            self.imageDimensions &&
            self.imageDimensions(d)['nodeChildrenStackColor'] && !self.verticaltree
          ) {
            return self.imageDimensions(d)['nodeChildrenStackColor'];
          } else if (d._children) {
            if (
              self.imageDimensions &&
              self.imageDimensions(d)['nodeChildrenFlipStackColor'] && self.verticaltree
            ) {
              return self.imageDimensions(d)['nodeChildrenFlipStackColor'];
            } else {
            return '../../../assets/images/grey-stack.png';
            }
          }
        }
      })
      .attr('height', function (d) {
        if (
          self.imageDimensions &&
          self.imageDimensions(d)['nodeChildrenImageHeight']
        ) {
          return self.imageDimensions(d)['nodeChildrenImageHeight'];
        } else {
          return '55px';
        }
      })
      .attr('width', function (d) {
        if (
          self.imageDimensions &&
          self.imageDimensions(d)['nodeChildrenImageWidth']
        ) {
          return self.imageDimensions(d)['nodeChildrenImageWidth'];
        } else {
          return '55px';
        }
      })

      .attr('x', function (d) {
        if (self.verticaltree) {
          if (
            self.imageDimensions &&
            self.imageDimensions(d)['nodeStackImageFlipCoordinateX'] && !d.children
          ) {
            return self.imageDimensions(d)['nodeStackImageFlipCoordinateX'];
          } else if  (self.imageDimensions &&
            self.imageDimensions(d)['nodeStackImageFlipCoordinateX'] && d.children) {
            return self.imageDimensions(d)['nodeStackImageFlipCoordinateX'];
          } else {
            return -27
          }
        } else {
        if (
          self.imageDimensions &&
          self.imageDimensions(d)['nodeStackImageCoordinateX']
        ) {
          return self.imageDimensions(d)['nodeStackImageCoordinateX'];
        } else {
          return '-24px';
        }
      }
      })
      .attr('y', function (d) {
        if (self.verticaltree) {
          if (
            self.imageDimensions &&
            self.imageDimensions(d)['nodeStackImageFlipCoordinateY'] && !d.children
          ) {
            return self.imageDimensions(d)['nodeStackImageFlipCoordinateY'] ;
          } else if  (self.imageDimensions &&
            self.imageDimensions(d)['nodeStackImageFlipCoordinateY'] && d.children) {
            return self.imageDimensions(d)['nodeStackImageFlipCoordinateY'];
          } else {
            return -20;
          }
        } else {
        if (
          self.imageDimensions &&
          self.imageDimensions(d)['nodeStackImageCoordinateY']
        ) {
          return self.imageDimensions(d)['nodeStackImageCoordinateY'];
        } else {
          return '-30px';
        }
      }
      });
      if (self.textDimensions && self.textDimensions.textFields && self.configValues.id !== 'tree-chart') {
        self.textDimensions.textFields.forEach(function (textValue) {
         self.nodeUpdate.select('tspan.' + textValue)
         .text((d) => {
          if (d[textValue] != null) {
            if (self.verticaltree) {
              
               return self.truncate_string(d[textValue], 12, '...');
             
           } else {
             
               return self.truncate_string(d[textValue], 30, '...');
             
           }
          } else {
            return d[textValue];
          }
        })
        .attr('class', textValue)
        .attr('x', 0)
        .attr('y', function (d) {
          if (self.verticaltree) {
            if (textValue === self.configValues.uniqueKey) {
              if (!d.children && !d._children) {
                return self.textDimensions.IdDisplayCoordinateY;
              } else {
                return self.textDimensions.IdDisplayFlipCoordinateY;
              }
            } else if (textValue.includes('Title') || textValue.includes('Name')) {
              if (!d.children && !d._children) {
                return self.textDimensions.TitleDisplayCoordinateY;
              } else {
                return self.textDimensions.TitleDisplayFlipCoordinateY;
              }
            } else {
              return '40px';
            }
          } else {
            if (textValue === self.configValues.uniqueKey) {
              return self.textDimensions.IdDisplayCoordinateY;
            } else if (textValue.includes('Title') || textValue.includes('Name')) {
              return self.textDimensions.TitleDisplayCoordinateY;
            } else {
              return '30px';
            }
          }
       })
        .style('font-family', function () {
          if (textValue === self.configValues.uniqueKey) {
            return 'robotobold';
          }
        });
    });
      } else {
        if (self.configValues.id === 'tree-chart') {
         
      self.nodeUpdate.select('tspan.futurePositionTitle')
      .text(d => {
        const positionTitle = d.futurePositionTitle || d.currentPositionTitle
        if (positionTitle != null) {
          if (self.verticaltree) { 
            return self.truncate_string(positionTitle, 12, '...');
          } else {
            return self.truncate_string(positionTitle, 30, '...');
          }
        } else {
          return positionTitle;
        }
      })
      .attr('y', function(d) {
        if (self.verticaltree) {
        if (!d.children && !d._children) {
          return self.textDimensions.TitleDisplayCoordinateY;
        } else {
          return self.textDimensions.TitleDisplayFlipCoordinateY;
        }
      } else {
        return self.textDimensions.TitleDisplayCoordinateY;
      }
      })
      self.nodeUpdate.select('tspan.positionId')
      .text(d => {
        if (self.verticaltree) {
        return ('(' + self.truncate_string(d.positionId, 12, '...') + ')');
        } else {
          return ('(' + self.truncate_string(d.positionId, 30, '...') + ')');
        }
      })
      .attr('x', 0)
      .attr('y', function(d) {
        if (self.verticaltree) {
        if (!d.children && !d._children) { 
          return self.textDimensions.IdDisplayCoordinateY;
        } else {
          return self.textDimensions.IdDisplayFlipCoordinateY;
        }
      } else {
        return self.textDimensions.IdDisplayCoordinateY;
      }
      })
      .style('font-family', 'robotobold');
        } else {
        self.nodeUpdate.select('tspan')
        .text((d) => {
          return '(' + d[self.configValues.uniqueKey] + ')';
        })
      }
    }
     self.nodeUpdate.select('tspan.rollCount')
      .text(d => {
      if (self.configValues.isCountedRootNode) {
        if (d.futureNumberOfTotalReports > 0) {
          return `Reports: ${d.futureNumberOfTotalReports}(${d.futureNumberOfDirectReports})`;
        }
    } else {
      const children = d.children || d._children;
      if (children) {
        const count = self.childCounter(d, false);
        return `Reports: ${count.toLocaleString()}(${children.length})`;
      }
    }
    });

    self.nodeExit = self.node
      .exit()
      .transition()
      .duration(self.duration)
      .attr('transform', function (d) {
        if (self.verticaltree) {
          return 'translate(' + source.x + ',' + source.y + ')';
        } else {
        return 'translate(' + source.y + ',' + source.x + ')';
        }
      })
      .remove();

    self.nodeExit.select('text').style('fill-opacity', function (d) {
      if (self.imageDimensions && self.imageDimensions(d)['textOpacity']) {
        return self.imageDimensions(d)['textOpacity'];
      }
    });

    const nonRootNodes = self.nodes.filter(function (nd) {
      return nd.depth > 0;
    });

    self.links = self.tree.links(nonRootNodes);

    self.link = self.svgGroup
      .selectAll('path.link')
      .data(self.links, function (d) {
        return d.target.id;
      });
if (self.verticaltree) {
  self.link
  .enter()
  .insert('path', 'g')
  .attr('class', 'link ' + this.configValues.class)
  .attr('d', function(d) {
    const s = {
        x: d.source.x,
        y: d.source.y
    };
    const t = {
      x: d.target.x,
      y: d.target.y
  };
    return self.verticaldiagonal(s, t);
});
self.link
  .attr('d', function(d) {
    const s = {
        x: d.source.x,
        y: d.source.y
    };
    const t = {
      x: d.target.x,
      y: d.target.y
  };
    return self.verticaldiagonal(s, t);
})
.style('stroke', function (d) {
     if (d.target.class === 'found') {
       return '#ff4136';
     }
   })
   .style('stroke-width', function (d) {
     if (d.target.class === 'found') {
       return '3';
     }
   });
self.link
  .exit()
  .attr('d', function(d) {
    const s = {
        x: d.source.x,
        y: d.source.y
    };
    const t = {
      x: d.target.x,
      y: d.target.y
  };
    return self.verticaldiagonal(s, t);
})
  .remove();
} else {
  self.link
  .enter()
  .insert('path', 'g')
  .attr('class', 'link ' + this.configValues.class)
  .attr('d', function (d) {
    const o = { x: source.x0, y: source.y0 };
    return self.diagonal({ source: o, target: o });
  });

self.link
  .transition()
  .duration(self.duration)
  .attr('d', self.diagonal)
  .style('stroke', function (d) {
    if (d.target.class === 'found') {
      return '#ff4136';
    }
  });

self.link
  .exit()
  .transition()
  .duration(self.duration)
  .attr('d', function (d) {
    const o = { x: source.x, y: source.y };
    return self.diagonal({ source: o, target: o });
  })
  .remove();
}

    self.nodes.forEach(function (d) {
      d.x0 = d.x;
      d.y0 = d.y;
    });
    if (self.masterRoot.children && self.masterRoot.children.length > 0) {
      self.reCenterNode =
        self.masterRoot.children[
          Math.floor(self.masterRoot.children.length / 2)
        ];
    }

  if (iscenter) {
    self.centerTree();
  }
}
  singleClick(d) {
    const self = this;
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else {
      d.children = d._children;
      d._children = null;
    }
    self.clickBool = true;
    self.update(d);
  }
  click(d) {
    const self = this;
    self.clickCounter++;
    if (self.clickCounter === 1) {
      self.clickTimer = setTimeout(() => {
        self.clickCounter = 0;
        self.singleClick(d);
      }, 70);
    } else {
      clearTimeout(self.clickTimer);
      self.clickCounter = 0;
    }
  }
  zoom() {
    const self = this;
    self.svgGroup.attr(
      'transform',
      'translate(' + d3.event.translate + ')scale(' + d3.event.scale + ')'
    );
  }
  searchNode(positionId) {
    const self = this;
    self.searchPositionValue = positionId;
    if (typeof self.paths !== 'undefined' && self.paths !== false) {
      self.paths = self.paths.filter(
        (path) => path.hasOwnProperty('x') && path.hasOwnProperty('y')
      );
      self.removePreviousSearch(self.paths);
    }
    self.paths = self.searchTree(self.root, self.searchPositionValue, []);
    if (self.searchPositionValue) {

      if (self.paths) {
        self.openPaths(self.paths);
      } else {
        self.showAlert = true;
        if (self.showAlert && self.configValues.id === 'tree-chart') {
        const dialog: DialogRef = this.dialogSvc.open({
          content: 'Position ID:' +  this.searchPositionValue + ' does not exist in the data.',
      });
      setTimeout(function () {
        dialog.close();
      }, 750);
      }
    }
    } else {
     self.centerTree();
    }
  }
  nodeHighlight(positionId) {
    const self = this;
    let paths: any;
    paths = self.searchTree(self.root, positionId, []);
    paths.forEach((child: any) => {
      if (child[self.configValues.uniqueKey] !== 'Master Root') {
        if (child._children) {
          child.children = child._children;
          child._children = null;
        }
        self.update(child);
      }
    })
    if (positionId) {

      const foundNode = paths[paths.length - 1];
      if (this.configValues.id === 'tree-chart' && !self.verticaltree) {
        self.focusOnNode(foundNode);
      } else {
        self.centerNode(foundNode);
      }

    } else {
     self.centerTree();
    }
  }
  removePreviousSearch(path) {
    const self = this;
    for (let j = 0; j < path.length; j++) {
      if (path[j].id !== '1') {
        path[j].class = 'link';
        if (path[j]._children) {
          path[j].children = path[j]._children;
          path[j]._children = null;
        }
        self.update(path[j]);
      }
    }
  }
  searchTree(obj, search, path) {
    const self = this;
    if (
      Utilities.trimToUppercase(obj[self.configValues.uniqueKey].trim()) ===
      Utilities.trimToUppercase(search)
    ) {
      path.push(obj);
      return path;
    } else if (obj.children || obj._children) {
      const children = obj.children ? obj.children : obj._children;
      for (let j = 0; j < children.length; j++) {
        path.push(obj);
        const found = self.searchTree(children[j], search, path);
        if (found) {

          return found;
        } else {
          path.pop();
        }
      }
    } else {
      return false;
    }
  }
  openPaths(path) {
    const self = this;
    for (let j = 0; j < path.length; j++) {
      if (path[j].id !== '1') {
        path[j].class = 'found';
        if (path[j]._children) {
          path[j].children = path[j]._children;
          path[j]._children = null;
        }
        self.update(path[j]);
      }
    }
    const foundNode = path[path.length - 1];
    self.centerNode(foundNode);
  }


  centerNode(source) {
    const self = this;
    const scale = 1;
    let x, y;
    if (this.verticaltree) {
       x = -source.x0;
       y = -source.y0;
    } else {
       x = -source.y0;
       y = -source.x0;
    }
    x = x * scale + this.width * (1 / 2) ;
    y = y * scale + this.height * (1 / 2) - 150;

    // x = x * scale + 70;
    // y = y * scale + this.height / 2;

    d3.select('g.' + self.configValues.class)
      .transition()
      .duration(self.duration)
      .attr('transform', 'translate(' + x + ',' + y + ')scale(' + scale + ')');
      self.zoomListener.scale(scale);
      self.zoomListener.translate([x, y]);
  }
  expand(d) {
    if (d._children) {
      d.children = d._children;
      d._children = null;
    }
  }
  pan(dmNode, direction) {
    const self = this;
    const speed = self.panSpeed;
    if (self.panTimer) {
      clearTimeout(self.panTimer);
      const translateCoords = d3.transform(self.svgGroup2.attr('transform'));
      let translateX, translateY;
      if (direction === 'left' || direction === 'right') {
        translateX =
          direction === 'left'
            ? translateCoords.translate[0] + speed
            : translateCoords.translate[0] - speed;
        translateY = translateCoords.translate[1];
      } else if (direction === 'up' || direction === 'down') {
        translateX = translateCoords.translate[0];
        translateY =
          direction === 'up'
            ? translateCoords.translate[1] + speed
            : translateCoords.translate[1] - speed;
      }
      const scaleX = translateCoords.scale[0];
      const scaleY = translateCoords.scale[1];
      const scale = self.zoomListener.scale();
      self.svgGroup
        .transition()
        .attr(
          'transform',
          'translate(' + translateX + ',' + translateY + ')scale(' + scale + ')'
      );
      d3.select(dmNode)
        .select('g.node')
        .attr('transform', 'translate(' + translateX + ',' + translateY + ')');
      self.zoomListener.scale(self.zoomListener.scale());
      self.zoomListener.translate([translateX, translateY]);
      self.panTimer = setTimeout(function () {
        self.pan(dmNode, direction);
      }, 50);
    }
  }
  initiateDrag(d, domNode) {
    const self = this;
    self.draggingNode = d;
    d3.select(domNode).select('.ghostCircle').attr('pointer-events', 'none');
    d3.selectAll('.ghostCircle').attr('class', 'ghostCircle show');
    d3.select(domNode).attr('class', 'node activeDrag');

    self.svgGroup.selectAll('g.node').sort(function (a, b) {
      if (a.id !== self.draggingNode.id) {
        return 1;
      } else {
        return -1;
      }
    });
    if (self.nodes.length > 1) {
      self.links = self.tree.links(self.nodes);
      self.link = self.svgGroup
        .selectAll('path.link')
        .data(self.links, function (c) {
          return c.target.id;
        })
        .remove();
      self.nodeExit = self.svgGroup
        .selectAll('g.node')
        .data(self.nodes, function (b) {
          return b.id;
        })
        .filter(function (f) {
          if (f.id === self.draggingNode.id) {
            return false;
          }
          return true;
        })
        .remove();
    }
    const parentLink = self.tree.links(self.tree.nodes(self.draggingNode.parent));
      self.svgGroup.selectAll('path.link').filter(function (g, i) {
        if (g.target.id === self.draggingNode.id) {
          return true;
        }
        return false;
      }).remove();
     self.dragStarted = null;
  }
  truncate_string(str, length, ellipsis) {
    if (str.length > length) {
      return str.substring(0, length - ellipsis.length) + ellipsis;
    } else {
      return str;
    }
  }
  childCounter(positions: Object, isAChild: boolean = false): number {
    const self = this;
    let count: number;
    if (isAChild) {
      count = 1;
    } else {
      count = 0;
    }
    const children = positions['children'] || positions['_children'];

    if (children) {
      children.forEach((child: Object) => {
        count += self.childCounter(child, true);
      });
    }

    return count;
  }


  centerTree() {
    if (this.verticaltree) {
      if (this.root.children) {
        if (this.root.children[0]) {
          const node = this.root.children[0];
           if (node.children) {
            this.focusOnNode(node.children[0])
          } else {
            this.focusOnNode(node);
          }
        }
      }
    } else {
      if (this.reCenterNode) {
        this.focusOnNode(this.reCenterNode)
        }
    }
  }


  focusOnNode(node) {
    const self = this;
    const scale = 1;
    let x, y;
    if (this.verticaltree) {
       x = -node.x0 + 40;
       y = -node.y0;
    //  x = x * 2 + 50;
     y = y * scale + this.height / 4;
    } else {
       x = -node.y0;
       y = -node.x0;
      x = x * scale + 70;
      y = y * scale + self.height / 2;
      }

    // x = x * scale + this.width * (1 / 2) ;
    // y = y * scale + this.height * (1 / 2) - 150;
    d3.select('g.' + self.configValues.class).transition()
      .duration(self.duration)
      .attr('transform', 'translate(' + (x) + ',' + (y) + ')scale(' + scale + ')');
      self.zoomListener.scale(scale);
      self.zoomListener.translate([x, y]);
  }
  /**
   * @param s : source x and y coordinates
   * @param t : target x and y coordinates
   * @returns : path
   * Reference : https://observablehq.com/@bumbeishvili/d3-v5-organization-chart
   */
  verticaldiagonal(s, t) {
    const x = s.x;
    const y = s.y + 40;
    const ex = t.x;
    const ey = t.y;

    const xrvs = ex - x < 0 ? -1 : 1;
    const yrvs = ey - y < 0 ? -1 : 1;

    const rdef = 35;
    let r = Math.abs(ex - x) / 2 < rdef ? Math.abs(ex - x) / 2 : rdef;

    r = Math.abs(ey - y) / 2 < r ? Math.abs(ey - y) / 2 : r;

    const h = Math.abs(ey - y) / 2 - r;
    const w = Math.abs(ex - x) - r * 2;
    const path = `
        M ${x} ${y}
        L ${x} ${y + h * yrvs}
        C  ${x} ${y + h * yrvs + r * yrvs} ${x} ${y + h * yrvs + r * yrvs} ${x + r * xrvs} ${y + h * yrvs + r * yrvs}
        L ${x + w * xrvs + r * xrvs} ${y + h * yrvs + r * yrvs}
        C  ${ex}  ${y + h * yrvs + r * yrvs} ${ex}  ${y + h * yrvs + r * yrvs} ${ex} ${ey - h * yrvs}
        L ${ex} ${ey}
`
    return path;
}

formatTreeDepth(level: any) {
const self = this;
  if (!_.isEmpty(level)) {
    let selectedLevel = level.value;
    selectedLevel = selectedLevel > 1 ? selectedLevel : 1;
    self.expandTreeToLevel(selectedLevel);
    self.update(this.masterRoot);
    self.centerTree();
  }
}
expandTreeToLevel(level: number, startNode: any = this.masterRoot): void {
  const self = this;
  if (level > 0) {
    const children: any[] = startNode.children || startNode._children;
    self.expand(startNode);
    if (children) {
      children.forEach((child: any) => {
        self.expandTreeToLevel(level - 1, child);
      })
    }
  } else {
    collapse(startNode);
  }
  function collapse(d) {
    if (d.children) {
      d._children = d.children;
      d._children.forEach(collapse);
      d.children = null;
    }
  }
}
}
