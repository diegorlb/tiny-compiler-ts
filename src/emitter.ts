import { writeFile } from "node:fs";

export class Emitter {
  private path: string;
  private header: string[];
  private code: string[];

  constructor(path: string) {
    this.path = path;
    this.header = [];
    this.code = [];
  }

  public emit(code: string) {
    this.code.push(code);
  }

  public emit_line(code: string) {
    this.code.push(`${code}\n`);
  }

  public emit_header(code: string) {
    this.header.push(`${code}\n`);
  }

  public write_file() {
    writeFile(
      this.path,
      `${this.header.join("")}\n${this.code.join("")}`,
      (error) => {}
    );
  }
}
