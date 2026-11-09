declare module 'opentype.js' {
  interface Path {
    toPathData(decimalPlaces?: number): string;
  }
  interface Font {
    getPath(text: string, x: number, y: number, fontSize: number, options?: object): Path;
    getAdvanceWidth(text: string, fontSize: number, options?: object): number;
  }
  function load(url: string, callback: (err: Error | null, font: Font) => void): void;
  function loadSync(url: string): Font;
}
