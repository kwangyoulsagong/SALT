import { inflateRawSync } from "node:zlib";

/**
 * zip 한 항목 풀기 — 라이브러리 없이(중앙 디렉터리 → 로컬 헤더 → deflate). KIS 종목 마스터 · DART 고유번호 · DART 공시 원문이 쓴다
 */
/** zip 의 첫 항목을 푼다(DART 공시 원문은 첫 항목이 본문). 저장 방식은 deflate(8) · 무압축(0) 만 */
export const unzipFirstEntry = (zip: Buffer): Buffer => {
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error("zip 끝 레코드 없음");
  const centralOffset = zip.readUInt32LE(eocd + 16);
  if (zip.readUInt32LE(centralOffset) !== 0x02014b50) throw new Error("zip 중앙 디렉터리 없음");
  const method = zip.readUInt16LE(centralOffset + 10);
  const compressedSize = zip.readUInt32LE(centralOffset + 20);
  const localOffset = zip.readUInt32LE(centralOffset + 42);
  if (zip.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("zip 로컬 헤더 없음");
  const dataStart = localOffset + 30 + zip.readUInt16LE(localOffset + 26) + zip.readUInt16LE(localOffset + 28);
  const data = zip.subarray(dataStart, dataStart + compressedSize);
  if (method === 0) return Buffer.from(data);
  if (method === 8) return inflateRawSync(data);
  throw new Error(`zip 압축 방식 미지원: ${method}`);
};

