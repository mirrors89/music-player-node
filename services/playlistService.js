const Song = require('../models/Song');

class PlaylistService {
  constructor(io) {
    this.io = io; // Socket.IO instance for broadcasting
  }

  /**
   * Add a new song to the playlist
   */
  addSong(youtubeSearchResult, requester = null) {
    const wasQueueEmpty = this.getUnplayedCount() === 0;

    const maxOrder = Song.getMaxPlayOrder();
    const playOrder = maxOrder + 1;

    const song = Song.create({
      youtubeId: youtubeSearchResult.videoId,
      title: youtubeSearchResult.title,
      channelTitle: youtubeSearchResult.channelTitle,
      thumbnailUrl: youtubeSearchResult.thumbnailUrl,
      duration: youtubeSearchResult.duration,
      playOrder: playOrder,
      requestedByUserId: requester?.userId,
      requestedByUserName: requester?.userName
    });

    // Broadcast update to all connected clients
    this.broadcastUpdate();

    // Notify clients that playback can resume after an idle queue
    if (wasQueueEmpty && this.io) {
      this.io.emit('playlist-resume', {
        song: {
          id: song.id,
          youtubeId: song.youtubeId,
          title: song.title,
          channelTitle: song.channelTitle,
          playOrder: song.playOrder
        }
      });
    }

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
   * Skip current song and move to next
   * Marks the first unplayed song as played and returns the next song
   */
  skipToNext() {
    const currentSong = this.getCurrentSong();

    if (!currentSong) {
      return {
        success: false,
        message: 'No song to skip'
      };
    }

    // Mark current song as played
    this.markAsPlayed(currentSong.id);

    // Get next song
    const nextSong = this.getCurrentSong();

    return {
      success: true,
      skipped: {
        id: currentSong.id,
        title: currentSong.title
      },
      next: nextSong ? {
        id: nextSong.id,
        title: nextSong.title,
        youtubeId: nextSong.youtubeId,
        channelTitle: nextSong.channelTitle,
        playOrder: nextSong.playOrder
      } : null,
      message: nextSong
        ? `"${currentSong.title}" 건너뛰기 완료. 다음 곡: "${nextSong.title}"`
        : `"${currentSong.title}" 건너뛰기 완료. 재생목록이 비어있습니다.`
    };
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
