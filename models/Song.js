const db = require('../config/database');

class Song {
  /**
   * Add a new song to the database
   */
  static create({ youtubeId, title, channelTitle, thumbnailUrl, duration, playOrder, requestedByUserId, requestedByUserName }) {
    const stmt = db.prepare(`
      INSERT INTO songs (youtube_id, title, channel_title, thumbnail_url, duration, play_order, requested_by_user_id, requested_by_user_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(youtubeId, title, channelTitle, thumbnailUrl, duration, playOrder, requestedByUserId || null, requestedByUserName || null);

    return this.findById(result.lastInsertRowid);
  }

  /**
   * Find song by ID
   */
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM songs WHERE id = ?');
    const song = stmt.get(id);
    return song ? this.mapToObject(song) : null;
  }

  /**
   * Get all songs ordered by play order (only today's songs)
   */
  static findAll() {
    const stmt = db.prepare(`
      SELECT * FROM songs
      WHERE DATE(created_at) = DATE('now')
      ORDER BY play_order ASC
    `);
    const songs = stmt.all();
    return songs.map(song => this.mapToObject(song));
  }

  /**
   * Get unplayed songs ordered by play order (only today's songs)
   */
  static findUnplayed() {
    const stmt = db.prepare(`
      SELECT * FROM songs
      WHERE is_played = 0
      AND DATE(created_at) = DATE('now')
      ORDER BY play_order ASC
    `);
    const songs = stmt.all();
    return songs.map(song => this.mapToObject(song));
  }

  /**
   * Get first unplayed song (current song, only today's songs)
   */
  static findCurrent() {
    const stmt = db.prepare(`
      SELECT * FROM songs
      WHERE is_played = 0
      AND DATE(created_at) = DATE('now')
      ORDER BY play_order ASC
      LIMIT 1
    `);
    const song = stmt.get();
    return song ? this.mapToObject(song) : null;
  }

  /**
   * Mark song as played
   */
  static markAsPlayed(id) {
    const stmt = db.prepare(`
      UPDATE songs 
      SET is_played = 1, played_at = datetime('now') 
      WHERE id = ?
    `);
    
    stmt.run(id);
    return this.findById(id);
  }

  /**
   * Delete song by ID
   */
  static delete(id) {
    const stmt = db.prepare('DELETE FROM songs WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Get max play order value (only today's songs)
   */
  static getMaxPlayOrder() {
    const stmt = db.prepare(`
      SELECT COALESCE(MAX(play_order), 0) as max_order FROM songs
      WHERE DATE(created_at) = DATE('now')
    `);
    const result = stmt.get();
    return result.max_order;
  }

  /**
   * Count unplayed songs (only today's songs)
   */
  static countUnplayed() {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM songs
      WHERE is_played = 0
      AND DATE(created_at) = DATE('now')
    `);
    const result = stmt.get();
    return result.count;
  }

  /**
   * Map database row to object (convert SQLite INTEGER to boolean for is_played)
   */
  static mapToObject(row) {
    return {
      id: row.id,
      youtubeId: row.youtube_id,
      title: row.title,
      channelTitle: row.channel_title,
      thumbnailUrl: row.thumbnail_url,
      duration: row.duration,
      playOrder: row.play_order,
      isPlayed: row.is_played === 1,
      createdAt: row.created_at,
      playedAt: row.played_at,
      requestedByUserId: row.requested_by_user_id,
      requestedByUserName: row.requested_by_user_name
    };
  }
}

module.exports = Song;
