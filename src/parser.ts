import { Emitter } from "./emitter.js";
import { Lexer } from "./lexer.js";
import { Token, TokenType } from "./token.js";

export class Parser {
  private lexer: Lexer;
  private emmiter: Emitter;

  private current_token: Token | undefined;
  private peek_token: Token | undefined;

  private symbols: string[];
  private declared_labels: string[];
  private gotoed_labels: string[];

  constructor(lexer: Lexer, emitter: Emitter) {
    this.lexer = lexer;
    this.emmiter = emitter;

    this.current_token = undefined;
    this.peek_token = undefined;

    this.symbols = [];
    this.declared_labels = [];
    this.gotoed_labels = [];

    this.next_token();
    this.next_token();
  }

  /** Return true if the current token matches */
  private check_current(token_type: TokenType): boolean {
    return this.current_token?.is(token_type) ?? false;
  }

  /** Return true if the next token matches */
  private check_peek(token_type: TokenType): boolean {
    return this.peek_token?.is(token_type) ?? false;
  }

  /** Error while parsing, print message and exit */
  private abort(message: string): Error {
    return new Error(`[Parsing error] ${message}`);
  }

  /** Try to match current token. If not, error. Advances the current token @throws {Error} */
  private match_current(token_type: TokenType) {
    if (this.check_current(token_type)) return this.next_token();

    throw this.abort(
      `Expected ${TokenType[token_type]}, got ${
        TokenType[this.current_token?.token_type ?? -1]
      }`
    );
  }

  /** Advance the current token */
  private next_token() {
    this.current_token = this.peek_token;
    this.peek_token = this.lexer.get_token();
  }

  private parse_new_line() {
    // console.log("NEWLINE");

    // Require at least one newline
    this.match_current(TokenType.NEWLINE);

    // But we will allow extra newlines too
    while (this.check_current(TokenType.NEWLINE)) {
      this.next_token();
    }
  }

  public parse_program() {
    // console.log("PROGRAM");
    this.emmiter.emit_header("#include <stdio.h>");
    this.emmiter.emit_header("int main(void) {");

    // Skip the excess of newlines
    while (this.check_current(TokenType.NEWLINE)) {
      this.next_token();
    }

    // Parse all the statements in the program
    while (!this.check_current(TokenType.EOF)) {
      this.parse_statement();
    }

    this.emmiter.emit_line("return 0;");
    this.emmiter.emit_line("}");

    // Check that each label referenced is a GOTO is declared
    for (const goto_label of this.gotoed_labels) {
      if (this.declared_labels.includes(goto_label)) continue;
      throw this.abort(`Attempting to GOTO to undeclared label: ${goto_label}`);
    }
  }

  private parse_statement() {
    // Check the first token to see what kind of statement this is

    // "PRINT" (expression | string)
    if (this.check_current(TokenType.PRINT)) {
      // console.log("STATEMENT-PRINT");
      this.next_token();

      if (this.check_current(TokenType.STRING)) {
        // Simple string
        this.emmiter.emit_line(
          `printf("${this.current_token?.token_value}\\n");`
        );
        this.next_token();
      } else {
        // Expect an expression
        this.emmiter.emit(`printf("%.2f\\n", (float)(`);
        this.parse_expression();
        this.emmiter.emit_line("));");
      }
    }

    // "IF" comparison "THEN" { statement } "ENDIF"
    else if (this.check_current(TokenType.IF)) {
      // console.log("STATEMENT-IF");
      this.next_token();

      this.emmiter.emit("if (");
      this.parse_comparison();
      this.match_current(TokenType.THEN);
      this.parse_new_line();
      this.emmiter.emit_line(") {");

      // Zero or more statements in the body
      while (!this.check_current(TokenType.ENDIF)) {
        this.parse_statement();
      }

      this.match_current(TokenType.ENDIF);
      this.emmiter.emit_line("}");
    }

    // "WHILE" comparison "REPEAT" newline { statement newline } "ENDWHILE"
    else if (this.check_current(TokenType.WHILE)) {
      // console.log("STATEMENT-WHILE");
      this.next_token();

      this.emmiter.emit("while (");
      this.parse_comparison();
      this.match_current(TokenType.REPEAT);
      this.parse_new_line();
      this.emmiter.emit_line(") {");

      // Zero or more statements in the loop body
      while (!this.check_current(TokenType.ENDWHILE)) {
        this.parse_statement();
      }

      this.match_current(TokenType.ENDWHILE);
      this.emmiter.emit_line("}");
    }

    // "LABEL" identifier
    else if (this.check_current(TokenType.LABEL)) {
      // console.log("STATEMENT-LABEL");
      this.next_token();

      const label = this.current_token?.token_value ?? "";
      if (this.declared_labels.includes(label)) {
        throw this.abort(`Label already exists: ${label}`);
      }

      this.declared_labels.push(label);

      this.emmiter.emit_line(`${label}:`);
      this.match_current(TokenType.IDENTIFIER);
    }

    // "GOTO" identifier
    else if (this.check_current(TokenType.GOTO)) {
      // console.log("STATEMENT-GOTO");
      this.next_token();

      const label = this.current_token?.token_value ?? "";
      this.gotoed_labels.push(label);

      this.emmiter.emit_line(`goto ${label};`);
      this.match_current(TokenType.IDENTIFIER);
    }

    // "LET" identifier "=" expression
    else if (this.check_current(TokenType.LET)) {
      // console.log("STATEMENT-LET");
      this.next_token();

      // Check if identifier exists in symbol table. If not, declare it
      const identifier = this.current_token?.token_value ?? "";
      if (!this.symbols.includes(identifier)) {
        this.symbols.push(identifier);
        this.emmiter.emit_header(`float ${identifier};`);
      }

      this.emmiter.emit(`${identifier} = `);
      this.match_current(TokenType.IDENTIFIER);
      this.match_current(TokenType.EQ);
      this.parse_expression();
      this.emmiter.emit_line(";");
    }

    // "INPUT" identifier
    else if (this.check_current(TokenType.INPUT)) {
      // console.log("STATEMENT-INPUT");
      this.next_token();

      // If variable doesn't already exists, declare it
      const identifier = this.current_token?.token_value ?? "";
      if (!this.symbols.includes(identifier)) {
        this.symbols.push(identifier);
        this.emmiter.emit_header(`float ${identifier};`);
      }

      this.emmiter.emit_line(`if (0 == scanf("%f", &${identifier})) {`);
      this.emmiter.emit_line(`${identifier} = 0;`);
      this.emmiter.emit_line(`scanf("%*s");`);
      this.emmiter.emit_line("}");

      this.match_current(TokenType.IDENTIFIER);
    }

    // This is not a valid statement
    else {
      throw this.abort(
        `Invalid statement at ${this.current_token?.token_value} (${
          TokenType[this.current_token?.token_type ?? -1]
        })`
      );
    }

    this.parse_new_line();
  }

  // expression ::= term { ( "-" | "+" ) term }
  private parse_expression() {
    // console.log("EXPRESSION");
    this.parse_term();

    // Can have zero or more +/- and expressions
    while (
      this.check_current(TokenType.PLUS) ||
      this.check_current(TokenType.MINUS)
    ) {
      this.emmiter.emit(this.current_token?.token_value ?? "");
      this.next_token();
      this.parse_term();
    }
  }

  // comparison ::= expression (( "==" | "!=" | ">" | ">=" | "<" | "<=" ) expression)+
  private parse_comparison() {
    // console.log("COMPARISON");
    this.parse_expression();

    // Must be at least one comparison operator and another expression
    if (this.current_token?.is_comparator()) {
      this.emmiter.emit(this.current_token?.token_value ?? "");
      this.next_token();
      this.parse_expression();
    } else {
      throw this.abort(
        `Expected comparison operator at: ${this.current_token?.token_value}`
      );
    }

    // Can have zero or more comparison operator and expressions
    while (this.current_token?.is_comparator()) {
      this.emmiter.emit(this.current_token?.token_value ?? "");
      this.next_token();
      this.parse_expression();
    }
  }

  // term ::= unary {( "/" | "*" ) unary}
  private parse_term() {
    // console.log("TERM");
    this.parse_unary();

    // Can have zero or more *// and expressions
    while (
      this.check_current(TokenType.ASTERISK) ||
      this.check_current(TokenType.SLASH)
    ) {
      this.emmiter.emit(this.current_token?.token_value ?? "");
      this.next_token();
      this.parse_unary();
    }
  }

  // unary ::= ["+" | "-"] primary
  private parse_unary() {
    // console.log("UNARY");

    if (
      this.check_current(TokenType.PLUS) ||
      this.check_current(TokenType.MINUS)
    ) {
      this.emmiter.emit(this.current_token?.token_value ?? "");
      this.next_token();
    }

    this.parse_primary();
  }

  // primary ::= number | identifier
  private parse_primary() {
    // console.log(`PRIMARY (${this.current_token?.token_value})`);

    if (this.check_current(TokenType.NUMBER)) {
      this.emmiter.emit(this.current_token?.token_value ?? "");
      this.next_token();
    } else if (this.check_current(TokenType.IDENTIFIER)) {
      // Ensure the variable already exists
      const identifier = this.current_token?.token_value ?? "";
      if (!this.symbols.includes(identifier)) {
        throw this.abort(
          `Referencing variable before assignment: ${identifier}`
        );
      }

      this.emmiter.emit(identifier);
      this.next_token();
    } else {
      throw this.abort(
        `Unexpected token at ${this.current_token?.token_value}`
      );
    }
  }
}
