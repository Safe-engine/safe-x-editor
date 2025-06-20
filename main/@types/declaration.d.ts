interface TreeViewData {
  id?: string;
  key: string;
  name: string;
  icon?: string;
  isDirectory: boolean;
  expanded: boolean;
  items?: TreeViewData[];
}
