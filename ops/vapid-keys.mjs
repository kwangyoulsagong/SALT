#!/usr/bin/env node
/**
 * 웹 푸시 VAPID 키 한 쌍 만들기(`SRV-REQ-062` FR-4) — P-256 · base64url(채움 없음). 공개키 65바이트 압축 안 된 점 · 개인키 32바이트.
 * 출력은 환경 변수 두 줄 — `salt-platform/.env`(로컬) 또는 관리형 비밀 저장소(운영)에 넣는다. 레포 · 이미지에 넣지 않는다.
 * 키를 바꾸면 기존 구독은 전부 403 — 휴대폰 앱이 열릴 때 다시 구독한다(`FE-REQ-078` FR-4).
 *
 * 실행: `node ops/vapid-keys.mjs`
 */
import { generateKeyPairSync } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const pub = publicKey.export({ format: "jwk" });
const priv = privateKey.export({ format: "jwk" });
const raw = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, "base64url"), Buffer.from(pub.y, "base64url")]);

console.log(`PUSH_VAPID_PUBLIC_KEY=${raw.toString("base64url")}`);
console.log(`PUSH_VAPID_PRIVATE_KEY=${priv.d}`);
