import { crc32, deflateRawSync } from "node:zlib";

/**
 * 작은 zip 쓰기 — 내 데이터 내보내기(`BFF-REQ-046` FR-7, 서버 S3c) 하나를 위해. 라이브러리를 들이지 않는 이유: 파일 수 · 크기가 작고
 * (사람 하나의 기록) 필요한 것은 "deflate + 중앙 디렉터리" 뿐이다. Node 22 `zlib.crc32` · `deflateRawSync` 로 끝난다.
 * ZIP64 · 암호 · 스트리밍 없음 — 4GB 를 넘을 일이 없다. 이름은 UTF-8 표시(일반 목적 비트 11).
 */
export interface ZipEntry {
  name: string;
  content: string | Buffer;
}

const DOS_EPOCH = { time: 0, date: (1 << 5) | 1 }; // 1980-01-01 00:00 — 시각을 싣지 않는다(같은 내용 = 같은 파일)

export const zip = (entries: readonly ZipEntry[]): Buffer => {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const raw = typeof entry.content === "string" ? Buffer.from(entry.content, "utf8") : entry.content;
    const body = deflateRawSync(raw);
    const crc = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // 필요 버전 2.0
    local.writeUInt16LE(0x0800, 6); // UTF-8 이름
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(DOS_EPOCH.time, 10);
    local.writeUInt16LE(DOS_EPOCH.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_EPOCH.time, 12);
    central.writeUInt16LE(DOS_EPOCH.date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + body.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
};
