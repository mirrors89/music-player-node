const Song = require('../models/Song');

class PlaylistService {
  constructor(io) {
    this.io = io; // Socket.IO instance for broadcasting
  }

  /**
   * Add a new song to the playlist
   */
  addSong(youtubeSearchResult) {
    const maxOrder = Song.getMaxPlayOrder();
    const playOrder = maxOrder + 1;

    const song = Song.create({
      youtubeId: youtubeSearchResult.videoId,
      title: youtubeSearchResult.title,
      channelTitle: youtubeSearchResult.channelTitle,
      thumbnailUrl: youtubeSearchResult.thumbnailUrl,
      duration: youtubeSearchResult.duration,
      playOrder: playOrder
    });

    // Broadcast update to all connected clients
    this.broadcastUpdate();

    return song;
  }

  /**
   * Get all songs ordered by play order
   */
  getAllSongs() {
    return Song.findAll();
  }

  /**
   * Get only unplayed songs
   */
  getUnplayedSongs() {
    return Song.findUnplayed();
  }

  /**
   * Get first unplayed song (current)
   */
  getCurrentSong() {
    return Song.findCurrent();
  }

  /**
   * Mark a song as played
   */
  markAsPlayed(songId) {
    const song = Song.markAsPlayed(songId);
    
    // Broadcast update to all connected clients
    this.broadcastUpdate();
    
    return song;
  }

  /**
   * Remove song from database
   */
  removeSong(songId) {
    const deleted = Song.delete(songId);
    
    if (deleted) {
      // Broadcast update to all connected clients
      this.broadcastUpdate();
    }
    
    return deleted;
  }

  /**
   * Get count of unplayed songs
   */
  getUnplayedCount() {
    return Song.countUnplayed();
  }

  /**
   * Broadcast playlist update to all connected WebSocket clients
   */
  broadcastUpdate() {
    if (this.io) {
      const unplayedSongs = this.getUnplayedSongs();
      this.io.emit('playlist-update', {
        songs: unplayedSongs,
        count: unplayedSongs.length
      });
    }
  }
}

module.exports = PlaylistService;
