import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deflateSync } from "node:zlib";

import { decodePng } from "../pngDecode";

/** 테스트용 PNG — 행마다 필터 바이트를 붙여 IDAT 하나로 */
const png = (width: number, height: number, colorType: number, rows: number[][], extra: Array<[string, Buffer]> = []) => {
  const chunk = (type: string, data: Buffer) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, "latin1");
    return Buffer.concat([head, data, Buffer.alloc(4)]); // CRC 는 디코더가 보지 않는다
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  const raw = Buffer.from(rows.flat());
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    ...extra.map(([t, d]) => chunk(t, d)),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

describe("decodePng — 로고 판정에 쓰는 범위", () => {
  it("RGBA · Sub · Up 필터를 되돌린다", () => {
    // 2x2: 1행 Sub(두 번째 픽셀 = 첫 픽셀 + 차), 2행 Up(위 행 + 차)
    const img = decodePng(
      png(2, 2, 6, [
        [1, 10, 20, 30, 255, 5, 5, 5, 0],
        [2, 1, 1, 1, 0, 1, 1, 1, 0],
      ]),
    );
    assert.deepEqual([...img.rgba], [10, 20, 30, 255, 15, 25, 35, 255, 11, 21, 31, 255, 16, 26, 36, 255]);
  });

  it("팔레트 + tRNS 투명", () => {
    const img = decodePng(
      png(2, 1, 3, [[0, 0, 1]], [
        ["PLTE", Buffer.from([255, 0, 0, 0, 0, 255])],
        ["tRNS", Buffer.from([0])],
      ]),
    );
    assert.deepEqual([...img.rgba], [255, 0, 0, 0, 0, 0, 255, 255]);
  });

  it("PNG 가 아니거나 지원 밖이면 던진다(판정을 미룬다)", () => {
    assert.throws(() => decodePng(Buffer.from("not a png")));
  });
});
