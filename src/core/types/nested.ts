/**
 * DTO が別の DTO を持つプロパティの型に使う。型としては T そのもの。
 * デコレータのメタデータ（design:type）にクラスが出なくなるので、DTO 同士の循環 import で
 * ESM・SWC が「初期化前のクラスを参照した」で落ちるのを防ぐ（TypeORM の Relation<T> と同じ仕組み）。
 */
export type Nested<T> = T;
