import {
  FilterEntries,
  MatchPattern,
  MatchRange,
  StringToNumber,
  ToEntries,
  ToRecord,
  ToValues,
} from "./types.js";

export enum TokenType {
  // Structure
  EOF = -1,
  NEWLINE = 0,
  NUMBER = 1,
  IDENTIFIER = 2,
  STRING = 3,

  // Keywords
  LABEL = 101,
  GOTO = 102,
  PRINT = 103,
  INPUT = 104,
  LET = 105,
  IF = 106,
  THEN = 107,
  ENDIF = 108,
  WHILE = 109,
  REPEAT = 110,
  ENDWHILE = 111,

  // Operators
  EQ = 201,
  PLUS = 202,
  MINUS = 203,
  ASTERISK = 204,
  SLASH = 205,
  EQEQ = 206,
  NOTEQ = 207,
  LT = 208,
  LTEQ = 209,
  GT = 210,
  GTEQ = 211,
}

type EnumSubset<F> = ToRecord<
  FilterEntries<
    ToEntries<typeof TokenType>,
    Extract<
      TokenType,
      F extends string ? StringToNumber<Extract<`${TokenType}`, F>> : F
    >
  >
>;

type Keywords = EnumSubset<MatchPattern<"1XX">>;
type Comparators = EnumSubset<MatchRange<206, 212>>;

const MappedKeywords: Keywords = {
  LABEL: TokenType.LABEL,
  GOTO: TokenType.GOTO,
  PRINT: TokenType.PRINT,
  INPUT: TokenType.INPUT,
  LET: TokenType.LET,
  IF: TokenType.IF,
  THEN: TokenType.THEN,
  ENDIF: TokenType.ENDIF,
  WHILE: TokenType.WHILE,
  REPEAT: TokenType.REPEAT,
  ENDWHILE: TokenType.ENDWHILE,
} as const;

const MappedComparators: ToValues<Comparators> = [
  TokenType.EQEQ,
  TokenType.NOTEQ,
  TokenType.LT,
  TokenType.LTEQ,
  TokenType.GT,
  TokenType.GTEQ,
];

export class Token {
  public token_type: TokenType;
  public token_value: string;

  constructor(token_value: string, token_type: TokenType) {
    this.token_type = token_type;
    this.token_value = token_value;
  }

  public is(token_type: TokenType): boolean {
    return this.token_type === token_type;
  }

  public is_comparator(): boolean {
    return MappedComparators.includes(
      this.token_type as (typeof MappedComparators)[number]
    );
  }

  public static get_token_type(value: string): TokenType {
    return MappedKeywords[value as keyof Keywords] ?? TokenType.IDENTIFIER;
  }
}
