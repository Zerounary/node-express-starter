export interface TableConfig {
  id: number;
  table: string;
  name?: string;
  mask: string;
  hideMenu?: boolean;
  defaultSort?: string;
  columns?: any[];
  actions?: any[];
}
