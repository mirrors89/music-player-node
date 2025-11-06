# Music Player Node.js

Node.js Express 기반의 YouTube 음악 플레이어 웹 서비스입니다. Slack 봇 통합 및 실시간 재생목록 관리 기능을 제공합니다.

## 주요 기능

- YouTube 영상 재생 및 재생목록 관리
- 실시간 WebSocket(Socket.IO)을 통한 재생목록 업데이트
- Slack 봇 통합 (명령어를 통한 곡 추가 및 검색)
- iPad/태블릿 친화적인 플레이어 UI
- SQLite 파일 기반 데이터베이스

## 기술 스택

- **Backend**: Node.js, Express.js
- **Database**: SQLite (better-sqlite3)
- **Real-time**: Socket.IO
- **Integrations**:
  - Slack Bolt SDK
  - YouTube Data API v3
- **Frontend**: HTML5, CSS3, Vanilla JavaScript, YouTube IFrame API

## 프로젝트 구조

```
music-player-node/
├── bin/
│   └── www                    # 서버 시작 스크립트
├── config/
│   ├── database.js            # SQLite 데이터베이스 설정
│   └── slack.js               # Slack 앱 설정
├── models/
│   └── Song.js                # Song 모델
├── services/
│   ├── playlistService.js     # 재생목록 비즈니스 로직
│   ├── youtubeService.js      # YouTube API 통합
│   └── slackCommandHandler.js # Slack 명령어 핸들러
├── routes/
│   ├── playlist.js            # REST API 라우트
│   └── slack.js               # Slack 이벤트 라우트
├── public/
│   └── player.html            # 플레이어 UI
├── data/
│   └── music-player.db        # SQLite 데이터베이스 파일 (자동 생성)
├── app.js                     # Express 앱 설정
├── package.json               # 프로젝트 의존성
└── .env                       # 환경 변수 (수동 생성 필요)
```

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성하고 필요한 값을 입력합니다:

```bash
cp .env.example .env
```

`.env` 파일 예시:

```bash
PORT=3000

# Slack Bot Configuration (필수 - Slack 통합 사용 시)
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret

# YouTube API Configuration (선택 - 검색 기능 사용 시)
YOUTUBE_API_KEY=your-youtube-api-key
```

#### Slack 설정 방법

1. https://api.slack.com/apps 에서 새 앱 생성
2. **OAuth & Permissions**:
   - Bot Token Scopes 추가: `chat:write`, `commands`
   - 워크스페이스에 앱 설치
   - Bot User OAuth Token 복사 → `SLACK_BOT_TOKEN`
3. **Slash Commands** 생성:
   - `/add-music` - Request URL: `http://your-server/slack/events`
   - `/search-music` - Request URL: `http://your-server/slack/events`
   - `/playlist` - Request URL: `http://your-server/slack/events`
4. **Interactivity & Shortcuts**:
   - Interactivity 활성화
   - Request URL: `http://your-server/slack/events`
5. **Basic Information**:
   - Signing Secret 복사 → `SLACK_SIGNING_SECRET`

#### YouTube API 설정 방법

1. https://console.cloud.google.com/ 에서 프로젝트 생성
2. YouTube Data API v3 활성화
3. API 키 생성 → `YOUTUBE_API_KEY`

> YouTube API 키가 없어도 기본 기능은 동작합니다 (YouTube oEmbed API 사용). 단, `/search-music` 명령어는 사용할 수 없습니다.

### 3. 서버 실행

#### 개발 모드 (nodemon)

```bash
npm run dev
```

#### 프로덕션 모드

```bash
npm start
```

서버는 기본적으로 `http://localhost:3000` 에서 실행됩니다.

## 사용 방법

### 웹 플레이어

브라우저에서 `http://localhost:3000/player.html` 접속

**플레이어 컨트롤**:
- **노래 불러오기**: 재생목록의 첫 번째 곡을 불러옵니다
- **다음 곡**: 현재 곡을 재생완료 처리하고 다음 곡을 재생합니다
- **정지**: 재생을 중지합니다

### Slack 명령어

#### 1. `/add-music <YouTube URL 또는 Video ID>`

YouTube URL 또는 비디오 ID를 직접 재생목록에 추가합니다.

**예시**:
```
/add-music https://www.youtube.com/watch?v=dQw4w9WgXcQ
/add-music dQw4w9WgXcQ
/add-music https://youtu.be/dQw4w9WgXcQ
```

#### 2. `/search-music <검색어>`

YouTube에서 곡을 검색하고 결과 중 하나를 선택하여 추가할 수 있습니다.

**예시**:
```
/search-music 아이유 좋은날
/search-music BTS Dynamite
```

검색 결과마다 "재생목록에 추가" 버튼이 표시됩니다.

> 이 명령어는 YouTube API 키가 필요합니다.

#### 3. `/playlist`

현재 재생목록의 미재생 곡 목록을 확인합니다 (최대 10곡).

### REST API

#### GET `/api/playlist`
모든 곡 조회 (재생 순서대로 정렬)

#### GET `/api/playlist/unplayed`
미재생 곡만 조회

#### GET `/api/playlist/current`
현재 재생할 곡 조회 (첫 번째 미재생 곡)

#### POST `/api/playlist/:songId/played`
특정 곡을 재생완료 처리

#### DELETE `/api/playlist/:songId`
특정 곡 삭제

#### GET `/api/playlist/count`
미재생 곡 개수 조회

**응답 예시**:
```json
{
  "count": 5
}
```

## 실시간 업데이트 (Socket.IO)

플레이어는 Socket.IO를 통해 실시간으로 재생목록 업데이트를 받습니다.

**이벤트**:
- `playlist-update`: 재생목록이 변경되었을 때 발생
  ```javascript
  {
    "songs": [...],
    "count": 5
  }
  ```

## 데이터베이스 스키마

### songs 테이블

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary Key (자동 증가) |
| youtube_id | TEXT | YouTube 비디오 ID |
| title | TEXT | 곡 제목 |
| channel_title | TEXT | YouTube 채널명 |
| thumbnail_url | TEXT | 썸네일 URL |
| duration | TEXT | 영상 길이 (ISO 8601 형식) |
| play_order | INTEGER | 재생 순서 |
| is_played | INTEGER | 재생 완료 여부 (0 or 1) |
| created_at | TEXT | 생성 시간 |
| played_at | TEXT | 재생 완료 시간 |

## 개발

### 디버그 모드

```bash
DEBUG=music-player-node:* npm run dev
```

### 데이터베이스 초기화

데이터베이스를 초기화하려면 `data/music-player.db` 파일을 삭제하고 서버를 재시작하세요.

```bash
rm data/music-player.db
npm start
```

## 원본 프로젝트

이 프로젝트는 Kotlin Spring Boot H2 기반 music-player 프로젝트를 Node.js Express로 변환한 것입니다.

## 라이센스

ISC
