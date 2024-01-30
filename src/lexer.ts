import { Token, TokenType } from "./token.js";

const Whitespaces = [" ", "\t", "\r"];
const IllegalCharacters = ["\r", "\n", "\t", "\\", "%"];
const Digits = "0123456789".split("");
const Alpha = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export class Lexer {
  private source: string;
  private current_char: string;
  private current_position: number;

  constructor(source: string) {
    this.source = `${source}\n`;
    this.current_char = "";
    this.current_position = -1;

    this.next_char();
  }

  /** Process the next character */
  private next_char() {
    this.current_position += 1;

    if (this.current_position >= this.source.length) {
      this.current_char = "\0";
    } else {
      this.current_char = this.source[this.current_position];
    }
  }

  /** Return the lookahead character */
  private peek_char(): string {
    if (this.current_position + 1 >= this.source.length) {
      return "\0";
    }

    return this.source[this.current_position + 1];
  }

  /** Invalid token found, print error message and exit */
  private abort(message: string): Error {
    return new Error(`[Lexing error] ${message}`);
  }

  /** Skip comments in the code */
  private skip_comment() {
    if (this.current_char !== "#") return;
    while ((this.current_char as string) !== "\n") {
      this.next_char();
    }
  }

  /** Skip whitespace except new lines */
  private skip_whitespace() {
    while (Whitespaces.includes(this.current_char)) {
      this.next_char();
    }
  }

  /** Return the next token @throws {Error} */
  public get_token(): Token {
    this.skip_whitespace();
    this.skip_comment();

    let token: Token;
    switch (this.current_char) {
      // #region Operators
      case "+": {
        token = new Token("+", TokenType.PLUS);
        break;
      }

      case "-": {
        token = new Token("-", TokenType.MINUS);
        break;
      }

      case "*": {
        token = new Token("*", TokenType.ASTERISK);
        break;
      }

      case "/": {
        token = new Token("/", TokenType.SLASH);
        break;
      }

      case "=": {
        if (this.peek_char() === "=") {
          this.next_char();
          token = new Token("==", TokenType.EQEQ);
        } else {
          token = new Token("=", TokenType.EQ);
        }

        break;
      }

      case ">": {
        if (this.peek_char() === "=") {
          this.next_char();
          token = new Token(">=", TokenType.GTEQ);
        } else {
          token = new Token(">", TokenType.GT);
        }

        break;
      }

      case "<": {
        if (this.peek_char() === "=") {
          this.next_char();
          token = new Token("<=", TokenType.LTEQ);
        } else {
          token = new Token("<", TokenType.LT);
        }

        break;
      }

      case "!": {
        if (this.peek_char() === "=") {
          this.next_char();
          token = new Token("!=", TokenType.NOTEQ);
        } else {
          throw this.abort(`Expected !=, got !${this.peek_char()}`);
        }

        break;
      }
      // #endregion

      // #region Data
      case '"': {
        this.next_char();

        const start_position = this.current_position;
        while (this.current_char !== '"') {
          if (IllegalCharacters.includes(this.current_char)) {
            throw this.abort("Illegal character in string");
          }

          this.next_char();
        }

        const token_value = this.source.slice(
          start_position,
          this.current_position
        );

        token = new Token(token_value, TokenType.STRING);

        break;
      }
      // #endregion

      case "\n": {
        token = new Token(this.current_char, TokenType.NEWLINE);
        break;
      }

      case "\0": {
        token = new Token("", TokenType.EOF);
        break;
      }

      default: {
        if (Digits.includes(this.current_char)) {
          const start_position = this.current_position;

          while (Digits.includes(this.peek_char())) {
            this.next_char();
          }

          if (this.peek_char() === ".") {
            this.next_char();

            if (!Digits.includes(this.peek_char())) {
              throw this.abort("Illegal character in number");
            }

            while (Digits.includes(this.peek_char())) {
              this.next_char();
            }
          }

          const token_value = this.source.slice(
            start_position,
            this.current_position + 1
          );

          token = new Token(token_value, TokenType.NUMBER);

          break;
        }

        if (Alpha.includes(this.current_char)) {
          const start_position = this.current_position;
          while (Alpha.includes(this.peek_char())) {
            this.next_char();
          }

          const token_value = this.source.slice(
            start_position,
            this.current_position + 1
          );

          const token_type = Token.get_token_type(token_value);

          token = new Token(token_value, token_type);

          break;
        }

        throw this.abort(`Unknown token: ${this.current_char}`);
      }
    }

    this.next_char();

    return token;
  }
}
