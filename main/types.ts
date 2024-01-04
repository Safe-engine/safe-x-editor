export declare interface DevExtremeTree {
  id?: string;
  key: string;
  name: string;
  icon?: string;
  isDirectory: boolean;
  expanded: boolean;
  items?: DevExtremeTree[];
}