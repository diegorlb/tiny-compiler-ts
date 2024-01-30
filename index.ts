import { readFile } from "node:fs";

import { Lexer } from "./src/lexer.js";
import { Parser } from "./src/parser.js";
import { Emitter } from "./src/emitter.js";

function main() {
  readFile("./program.tiny", "utf8", (error, content) => {
    const lexer = new Lexer(content);
    const emitter = new Emitter("out.c");

    const parser = new Parser(lexer, emitter);

    try {
      parser.parse_program();
      emitter.write_file();
    } catch (error) {
      console.error((error as Error).message);
    }
  });
}

main();
