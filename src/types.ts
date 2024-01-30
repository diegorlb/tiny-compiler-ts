type Digits = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

type ReplaceAll<
  S extends string,
  M extends string,
  R extends string | number | boolean
> = S extends `${infer S1}${M}${infer S2}`
  ? `${S1}${R}${ReplaceAll<S2, M, R>}`
  : S;

type NthNumbers<
  N extends number,
  T extends number[] = []
> = T["length"] extends N ? T : NthNumbers<N, [...T, T["length"]]>;

type RangeArrayBuilder<
  L extends number,
  H extends number
> = NthNumbers<H> extends [...NthNumbers<L>, ...infer R] ? [...R, H] : [];

type UnionToIntersection<U> = (
  U extends unknown ? (arg: U) => 0 : never
) extends (arg: infer I) => 0
  ? I
  : never;

type LastInUnion<U> = UnionToIntersection<
  U extends unknown ? (x: U) => 0 : never
> extends (x: infer L) => 0
  ? L
  : never;

type UnionToTuple<U, Last = LastInUnion<U>> = [U] extends [never]
  ? []
  : [...UnionToTuple<Exclude<U, Last>>, Last];

export type MatchPattern<S extends string> = ReplaceAll<S, "X", Digits>;
export type MatchRange<L extends number, H extends number> = RangeArrayBuilder<
  L,
  H
>[number];

export type NumberToString<N extends number> = `${N}`;
export type StringToNumber<S extends string> =
  S extends `${infer N extends number}` ? N : never;

export type ToEntries<T> = {
  [K in keyof T]-?: [K, T[K]];
}[keyof T];

export type ToValues<T> = UnionToTuple<T[keyof T]>;

export type FilterEntries<
  T,
  U,
  F extends "keys" | "values" = "values"
> = T extends [infer K, infer V]
  ? F extends "keys"
    ? K extends U
      ? [K, V]
      : never
    : V extends U
    ? [K, V]
    : never
  : never;

export type ToRecord<T extends [string, any]> = [T] extends [never]
  ? "Error: found never type instead of array type"
  : {
      [K in T[0]]: T extends [K, infer V] ? V : never;
    };
