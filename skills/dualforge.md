# DualForge - 양쪽 도구로 작업 후 최적 결과 병합

Claude Code와 Codex CLI 양쪽에서 동일한 작업을 수행하고,
각 도구의 장점을 합쳐 최종 결과를 도출합니다.

## 트리거

- 키워드: `dualforge`, `dual`, `forge`, `양쪽에서 해봐`, `둘 다 해봐`, `비교해서 해봐`
- 명령어: `/dualforge <작업 설명>`

## 작동 방식

### Phase 1: 분해 (Decompose)

사용자 요청을 두 가지 관점으로 분해합니다:

- **Claude 프롬프트**: 아키텍처, 설계, 보안, 엣지 케이스, 트레이드오프 분석
- **Codex 프롬프트**: 구현, 코드, 성능, 파일 변경, 테스트 커버리지

### Phase 2: 병렬 실행 (Execute)

두 도구에 각각 맞춤화된 프롬프트를 전달합니다:

1. Claude Code (opus) → 아키텍처/설계 관점의 결과물
2. Codex CLI → 구현/실행 관점의 결과물

실행 방법:
- Claude Code 내에서: Agent 도구로 서브에이전트 실행 + Bash로 Codex CLI 호출
- Codex CLI 내에서: 에이전트 실행 + Bash로 Claude CLI 호출

아티팩트 저장 위치: `.omh/dualforge/{forge-id}/`

### Phase 3: 수집 (Collect)

양쪽 결과를 수집합니다:
- `.omh/dualforge/{forge-id}/claude-*.md`
- `.omh/dualforge/{forge-id}/codex-*.md`

### Phase 4: 합성 (Synthesize)

두 결과를 비교 분석하여 하나의 최적 결과를 도출합니다:

1. **합의 사항** - 양쪽 모두 동의하는 포인트 (높은 신뢰도)
2. **충돌 사항** - 의견이 다른 부분:
   - Claude 의견 + 근거
   - Codex 의견 + 근거
   - 최종 결정 + 이유
3. **병합 결과** - Claude의 설계 + Codex의 구현을 합친 최종본
4. **액션 체크리스트** - 구체적 실행 항목

### 병합 원칙

| 영역 | 우선 도구 | 이유 |
|------|----------|------|
| 아키텍처/설계 | Claude | 깊은 추론 능력 |
| 보안/엣지케이스 | Claude | 꼼꼼한 분석 |
| 코드 구현 | Codex | 실용적 코드 생성 |
| 성능 최적화 | Codex | 벤치마크 기반 |
| 테스트 코드 | Codex | 병렬 테스트 작성 |
| 트레이드오프 결정 | Claude | 근거 기반 추론 |

## 실행 프로토콜

아래 단계를 순서대로 실행하세요:

1. `.omh/dualforge/` 디렉토리 확인/생성
2. 사용자 요청을 Claude 프롬프트와 Codex 프롬프트로 분해
3. Claude Code 에이전트 (architect, opus) 실행 → 결과를 claude-*.md로 저장
4. Codex CLI를 Bash로 호출하여 실행 → 결과를 codex-*.md로 저장
   - Codex 미설치 시: Claude Code의 sonnet 에이전트로 대체 실행 (실용적 관점)
5. 양쪽 결과를 읽어 합성 프롬프트 생성
6. 최종 합성 결과 출력

## 폴백

- Codex CLI 미설치: Claude 서브에이전트 2개로 대체 (opus=설계, sonnet=구현)
- Claude CLI 미설치: Codex 에이전트 2개로 대체
- 둘 다 미설치: 현재 도구에서 2개 관점으로 분석

## 예시

```
사용자: dualforge 이 API의 인증 시스템 설계하고 구현해줘

결과:
## 합의 사항
- JWT + refresh token 방식 채택
- rate limiting 필수

## 충돌 사항
### 토큰 만료 시간
- Claude: 15분 (보안 우선)
- Codex: 1시간 (사용성 우선)
- 결정: 30분 + sliding window (절충)

## 병합 결과
[Claude의 설계 + Codex의 구현 코드 통합]

## 액션 체크리스트
1. auth middleware 구현
2. JWT 유틸리티 작성
3. refresh token 로직 구현
4. rate limiter 추가
5. 테스트 코드 작성
```
