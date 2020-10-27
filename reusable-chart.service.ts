import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable()
export class ReusableChartService {
public hideTooltip = new Subject<any>();
public nodeDblClicked = new Subject<string>();
public showToolTip = new Subject<any>();
public dragAndDropNodes = new Subject<any>();
public masterRoot: any;
  constructor() { }
}
