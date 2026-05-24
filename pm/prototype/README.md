# SALT PM Investment Prototype

PM이 증권/투자 기능을 설명하고 검증하기 위한 React 프로토타입이다.

## 실행

```bash
cd pm/prototype
python3 -m http.server 4173 --bind 127.0.0.1
```

브라우저에서 `http://127.0.0.1:4173`을 연다.

## 원칙

- 실제 서버를 호출하지 않는다.
- 더미 REST 응답은 `success/message/data` envelope을 따른다.
- 더미 WebSocket 이벤트는 BFF의 `price_update`, `candle`, `subscribed` 메시지 타입을 따른다.
- 이 프로토타입에서 바뀐 화면/정책은 `pm/features` 또는 `pm/reports` 문서에 반영한다.
