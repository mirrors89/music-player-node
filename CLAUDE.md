# Music Player Node.js - Claude Code Instructions

## Project Overview

YouTube 음악 플레이어 웹 서비스로, Slack 봇 통합 및 실시간 재생목록 관리 기능을 제공합니다.

**핵심 기능**:
- YouTube 영상 재생 및 재생목록 관리
- Socket.IO를 통한 실시간 업데이트
- Slack 봇 명령어 (`/add-music`, `/search-music`, `/playlist`)
- 일일 플레이리스트 (Asia/Seoul 시간대 기준)
- SQLite 파일 기반 데이터베이스

## Architecture

### Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite (better-sqlite3)
- **Real-time**: Socket.IO
- **Integrations**:
  - Slack Bolt SDK
  - YouTube Data API v3
- **Frontend**: Vanilla JavaScript, YouTube IFrame API

### Project Structure
```
music-player-node/
├── bin/www                      # Server startup script
├── config/
│   ├── database.js              # SQLite configuration
│   └── slack.js                 # Slack app setup
├── models/
│   └── Song.js                  # Song model
├── services/
│   ├── playlistService.js       # Playlist business logic
│   ├── youtubeService.js        # YouTube API integration
│   └── slackCommandHandler.js   # Slack command handlers
├── routes/
│   ├── playlist.js              # REST API routes
│   └── slack.js                 # Slack event routes
├── public/
│   └── player.html              # Player UI
└── data/
    └── music-player.db          # SQLite database file
```

## Coding Standards

### 1. Immutability (CRITICAL)

**ALWAYS** create new objects instead of mutating existing ones:

```javascript
// ❌ WRONG: Mutation
function updateSong(song, newTitle) {
  song.title = newTitle  // MUTATION!
  return song
}

// ✅ CORRECT: Immutability
function updateSong(song, newTitle) {
  return {
    ...song,
    title: newTitle
  }
}
```

### 2. Error Handling

**ALWAYS** handle errors comprehensively:

```javascript
// In routes
router.post('/playlist/:songId/played', (req, res) => {
  try {
    const result = playlistService.markAsPlayed(req.params.songId)
    res.json(result)
  } catch (error) {
    console.error('Failed to mark song as played:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to mark song as played'
    })
  }
})

// In services
function markAsPlayed(songId) {
  try {
    // Business logic
    return { success: true, data }
  } catch (error) {
    console.error('Error in markAsPlayed:', error)
    throw new Error(`Failed to mark song as played: ${error.message}`)
  }
}
```

### 3. Input Validation

**ALWAYS** validate user input:

```javascript
// Validate YouTube ID format
function isValidYouTubeId(id) {
  return /^[a-zA-Z0-9_-]{11}$/.test(id)
}

// Validate before processing
if (!isValidYouTubeId(youtubeId)) {
  throw new Error('Invalid YouTube video ID format')
}
```

### 4. Code Organization

- **Keep files focused** (<800 lines)
- **High cohesion, low coupling**
- **Many small files** > Few large files
- **No deep nesting** (>4 levels)

## Database Guidelines

### Schema: songs Table

```sql
CREATE TABLE songs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_id TEXT NOT NULL,
  title TEXT NOT NULL,
  channel_title TEXT,
  thumbnail_url TEXT,
  duration TEXT,
  play_order INTEGER NOT NULL,
  is_played INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  played_at TEXT,
  requested_by_user_id TEXT,
  requested_by_user_name TEXT
)
```

### Time Zone Handling (CRITICAL)

**모든 날짜 조회는 Asia/Seoul (UTC+9) 기준으로 처리해야 합니다**:

```javascript
// ✅ CORRECT: Asia/Seoul timezone
const today = `DATE(created_at, '+9 hours') = DATE('now', '+9 hours')`

db.prepare(`
  SELECT * FROM songs
  WHERE is_played = 0
    AND ${today}
  ORDER BY play_order ASC
`).all()

// ❌ WRONG: UTC timezone (incorrect for this project)
const today = "DATE(created_at) = DATE('now')"
```

### Database Best Practices

1. **Use prepared statements** for all queries (SQL injection prevention)
2. **Transaction management** for multiple operations
3. **Index optimization** on frequently queried columns (`created_at`, `is_played`, `play_order`)

```javascript
// Use prepared statements
const stmt = db.prepare('SELECT * FROM songs WHERE youtube_id = ?')
const song = stmt.get(youtubeId)

// Use transactions for multiple operations
const insertSong = db.transaction((song) => {
  const stmt = db.prepare('INSERT INTO songs (youtube_id, title, ...) VALUES (?, ?, ...)')
  return stmt.run(song.youtubeId, song.title, ...)
})
```

## Slack Integration

### Security Considerations

1. **Signature verification**: ALWAYS verify Slack signatures on `/slack` routes
2. **Body parser configuration**: Skip `express.json()` for `/slack` routes (Slack Bolt handles raw body)

```javascript
// app.js - CRITICAL: Skip body parser for Slack routes
app.use((req, res, next) => {
  if (req.path.startsWith('/slack')) {
    return next()
  }
  express.json()(req, res, next)
})
```

### Slack Command Handler Pattern

```javascript
// services/slackCommandHandler.js
async function handleAddMusic(ack, command, client) {
  await ack()  // Acknowledge immediately (3s timeout)

  try {
    // Process command
    const result = await addToPlaylist(command.text)

    // Respond to user
    await client.chat.postMessage({
      channel: command.user_id,
      text: `✅ Added: ${result.title}`
    })
  } catch (error) {
    console.error('Error handling /add-music:', error)
    await client.chat.postMessage({
      channel: command.user_id,
      text: `❌ Failed to add music: ${error.message}`
    })
  }
}
```

## Real-time Updates (Socket.IO)

### Event Emission Pattern

```javascript
// Emit playlist updates after any change
function emitPlaylistUpdate(io) {
  const songs = playlistService.getUnplayedSongs()
  const count = songs.length

  io.emit('playlist-update', {
    songs,
    count,
    timestamp: new Date().toISOString()
  })
}

// After adding song
router.post('/api/playlist', (req, res) => {
  const song = playlistService.addSong(req.body)
  emitPlaylistUpdate(req.app.get('io'))
  res.json({ success: true, data: song })
})
```

## YouTube Integration

### API Key Management

- YouTube API key is **optional** (fallback to oEmbed API)
- `/search-music` command requires API key
- Store in `.env` as `YOUTUBE_API_KEY`

### Video ID Extraction

```javascript
// Support multiple URL formats
function extractYouTubeId(input) {
  // Direct ID: dQw4w9WgXcQ
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input
  }

  // Full URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ
  // Short URL: https://youtu.be/dQw4w9WgXcQ
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/
  ]

  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match) return match[1]
  }

  throw new Error('Invalid YouTube URL or video ID')
}
```

## Security Checklist

Before committing code, verify:

- [ ] **No hardcoded secrets** (API keys, tokens)
- [ ] **All user inputs validated** (YouTube IDs, Slack inputs)
- [ ] **SQL injection prevention** (prepared statements)
- [ ] **XSS prevention** (sanitize user-generated content)
- [ ] **Slack signature verification** enabled
- [ ] **Rate limiting** on API endpoints
- [ ] **Error messages** don't leak sensitive data
- [ ] **Environment variables** properly configured

### Secrets Management

```javascript
// ✅ CORRECT: Environment variables
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

if (!SLACK_BOT_TOKEN) {
  throw new Error('SLACK_BOT_TOKEN is required')
}

// ❌ NEVER: Hardcoded secrets
const SLACK_BOT_TOKEN = "xoxb-1234567890-abcdefghijk"
```

## Testing Requirements

### Minimum Coverage: 80%

**Test Types** (all required):
1. **Unit Tests** - Service functions, utilities
2. **Integration Tests** - API endpoints, database operations
3. **E2E Tests** - Critical user flows (Slack commands, playlist management)

### Test-Driven Development Workflow

1. Write test first (RED)
2. Run test - should FAIL
3. Write minimal implementation (GREEN)
4. Run test - should PASS
5. Refactor (IMPROVE)
6. Verify 80%+ coverage

```javascript
// Example: Test first
describe('playlistService', () => {
  it('should add song to playlist with correct play_order', () => {
    const song = {
      youtubeId: 'dQw4w9WgXcQ',
      title: 'Test Song'
    }
    const result = playlistService.addSong(song)
    expect(result.play_order).toBe(1)
  })
})

// Then: Implement
function addSong(song) {
  const maxOrder = getMaxPlayOrder()
  const playOrder = maxOrder + 1
  // ... insert with playOrder
}
```

## Development Workflow

### 1. Feature Implementation

When implementing new features:

```
1. Use **planner** agent to create implementation plan
2. Use **tdd-guide** agent for test-driven development
3. Write tests FIRST (RED)
4. Implement to pass tests (GREEN)
5. Use **code-reviewer** agent immediately after writing code
6. Fix CRITICAL and HIGH issues
7. Use **security-reviewer** for security-sensitive code
8. Commit with descriptive message
```

### 2. Commit Message Format

```
<type>: <description>

<optional body>
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`

**Examples**:
```
feat: add /search-music Slack command
fix: correct Asia/Seoul timezone handling in daily playlist
refactor: extract YouTube ID validation to separate function
```

### 3. Pull Request Workflow

1. Analyze **full commit history** (not just latest commit)
2. Use `git diff main...HEAD` to see all changes
3. Draft comprehensive PR summary
4. Include test plan with TODOs
5. Push with `-u` flag if new branch

## Performance Considerations

### Model Selection

- **Haiku 4.5**: Simple file edits, single-file changes
- **Sonnet 4.5**: Main development work, complex tasks
- **Opus 4.5**: Architectural decisions, deep reasoning

### Database Optimization

1. **Index frequently queried columns**:
   ```sql
   CREATE INDEX idx_created_at ON songs(created_at)
   CREATE INDEX idx_is_played ON songs(is_played)
   CREATE INDEX idx_play_order ON songs(play_order)
   ```

2. **Use transactions for bulk operations**
3. **Avoid N+1 queries** - fetch related data in single query

## Environment Variables

Required:
```bash
PORT=3000
SLACK_BOT_TOKEN=xoxb-your-bot-token        # Required for Slack
SLACK_SIGNING_SECRET=your-signing-secret   # Required for Slack
```

Optional:
```bash
YOUTUBE_API_KEY=your-youtube-api-key       # Optional - enables /search-music
```

## Deployment Checklist

Before deploying:

- [ ] All tests pass (80%+ coverage)
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Slack app configured (slash commands, interactivity)
- [ ] YouTube API quota monitored
- [ ] Socket.IO CORS configured for production
- [ ] Error logging configured (production-ready)
- [ ] Health check endpoint available

## Known Patterns

### Daily Playlist Reset

The playlist automatically resets at midnight (Asia/Seoul time):
- `created_at` stores UTC time
- All queries add `'+9 hours'` offset for Asia/Seoul
- `play_order` starts from 1 each day
- Past data remains in database for historical queries

### Slack User Tracking

When adding songs via Slack:
```javascript
{
  requested_by_user_id: command.user_id,      // U12345678
  requested_by_user_name: command.user_name   // john.doe
}
```

### Socket.IO Event Pattern

Emit updates after ANY playlist modification:
- Add song → emit `playlist-update`
- Mark as played → emit `playlist-update`
- Delete song → emit `playlist-update`

## Troubleshooting

### Common Issues

1. **Slack signature verification fails**
   - Ensure `express.json()` is NOT applied to `/slack` routes
   - Verify `SLACK_SIGNING_SECRET` is correct

2. **Wrong timezone in playlist**
   - All queries must use `'+9 hours'` offset
   - Never use `DATE('now')` without timezone adjustment

3. **YouTube API quota exceeded**
   - Fallback to oEmbed API (no quota)
   - Cache video metadata to reduce API calls

4. **Socket.IO not connecting**
   - Check CORS configuration
   - Verify Socket.IO client version matches server

## References

- [Slack Bolt SDK](https://slack.dev/bolt-js/)
- [YouTube Data API v3](https://developers.google.com/youtube/v3)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)

---

**Last Updated**: 2026-02-10
