const express = require('express');
const router = express.Router();

// PlaylistService will be injected when initializing routes
let playlistService;

function initializeRouter(service) {
  playlistService = service;
  return router;
}

/**
 * GET /api/playlist - Get all songs ordered by playOrder
 */
router.get('/', (req, res) => {
  try {
    const songs = playlistService.getAllSongs();
    res.json(songs);
  } catch (error) {
    console.error('Error getting all songs:', error);
    res.status(500).json({ error: 'Failed to retrieve songs' });
  }
});

/**
 * GET /api/playlist/unplayed - Get only unplayed songs
 */
router.get('/unplayed', (req, res) => {
  try {
    const songs = playlistService.getUnplayedSongs();
    res.json(songs);
  } catch (error) {
    console.error('Error getting unplayed songs:', error);
    res.status(500).json({ error: 'Failed to retrieve unplayed songs' });
  }
});

/**
 * GET /api/playlist/current - Get first unplayed song
 */
router.get('/current', (req, res) => {
  try {
    const song = playlistService.getCurrentSong();
    if (song) {
      res.json(song);
    } else {
      res.status(404).json({ message: 'No unplayed songs found' });
    }
  } catch (error) {
    console.error('Error getting current song:', error);
    res.status(500).json({ error: 'Failed to retrieve current song' });
  }
});

/**
 * POST /api/playlist/:songId/played - Mark song as played
 */
router.post('/:songId/played', (req, res) => {
  try {
    const songId = parseInt(req.params.songId);
    const song = playlistService.markAsPlayed(songId);
    
    if (song) {
      res.json(song);
    } else {
      res.status(404).json({ error: 'Song not found' });
    }
  } catch (error) {
    console.error('Error marking song as played:', error);
    res.status(500).json({ error: 'Failed to mark song as played' });
  }
});

/**
 * DELETE /api/playlist/:songId - Remove song from playlist
 */
router.delete('/:songId', (req, res) => {
  try {
    const songId = parseInt(req.params.songId);
    const deleted = playlistService.removeSong(songId);
    
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Song not found' });
    }
  } catch (error) {
    console.error('Error deleting song:', error);
    res.status(500).json({ error: 'Failed to delete song' });
  }
});

/**
 * GET /api/playlist/count - Get count of unplayed songs
 */
router.get('/count', (req, res) => {
  try {
    const count = playlistService.getUnplayedCount();
    res.json({ count });
  } catch (error) {
    console.error('Error counting unplayed songs:', error);
    res.status(500).json({ error: 'Failed to count unplayed songs' });
  }
});

module.exports = { router, initializeRouter };
