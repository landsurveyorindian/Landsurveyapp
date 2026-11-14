declare module 'shpjs' {
  function shp(buffer: ArrayBuffer | string | Buffer): Promise<any>;
  namespace shp {
    function parseZip(buffer: ArrayBuffer | Buffer): Promise<any>;
    function parseShp(buffer: ArrayBuffer | Buffer, prj?: any): any[];
    function combine(arr: [any[], any[]]): any;
  }
  export default shp;
}
