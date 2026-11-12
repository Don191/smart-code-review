export interface Rect<T> {
    item: T;
    x: number;
    y: number;
    w: number;
    h: number;
}
/**
 * Squarified treemap (Bruls, Huizing and van Wijk). Lays the items out in a
 * w by h box with areas in proportion to value, keeping tiles close to square.
 */
export declare function squarify<T>(items: {
    item: T;
    value: number;
}[], w: number, h: number): Rect<T>[];
