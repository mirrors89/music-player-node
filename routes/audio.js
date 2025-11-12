const express = require('express');
const router = express.Router();
const ytdl = require('@distube/ytdl-core');

/**
 * GET /api/audio/stream/:videoId - Stream audio from YouTube
 * Returns audio-only stream for background playback
 */
router.get('/stream/:videoId', async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    console.log(`[Audio Stream] Starting stream for video: ${videoId}`);

    // Check if video exists and is accessible
    const info = await ytdl.getInfo(videoUrl);

    // Get audio format with best quality
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

    if (audioFormats.length === 0) {
      console.error(`[Audio Stream] No audio formats found for: ${videoId}`);
      return res.status(404).json({ error: 'No audio stream available' });
    }

    // Select best audio quality
    const format = audioFormats.reduce((prev, current) => {
      return (prev.audioBitrate || 0) > (current.audioBitrate || 0) ? prev : current;
    });

    console.log(`[Audio Stream] Selected format: ${format.mimeType}, bitrate: ${format.audioBitrate}`);

    // Set response headers for audio streaming
    res.setHeader('Content-Type', format.mimeType || 'audio/webm');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    // Stream the audio
    const audioStream = ytdl(videoUrl, {
      quality: 'highestaudio',
      filter: 'audioonly',
      format: format
    });

    audioStream.on('error', (error) => {
      console.error(`[Audio Stream] Stream error for ${videoId}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Audio stream error' });
      }
    });

    audioStream.on('end', () => {
      console.log(`[Audio Stream] Stream ended for ${videoId}`);
    });

    audioStream.pipe(res);

  } catch (error) {
    console.error('[Audio Stream] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to stream audio',
        message: error.message
      });
    }
  }
});

/**
 * GET /api/audio/info/:videoId - Get audio stream URL without actually streaming
 * Returns the direct audio URL for client-side playback
 */
router.get('/info/:videoId', async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    console.log(`[Audio Info] Getting info for video: ${videoId}`);

    const info = await ytdl.getInfo(videoUrl);
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

    if (audioFormats.length === 0) {
      return res.status(404).json({ error: 'No audio stream available' });
    }

    // Select best audio quality
    const format = audioFormats.reduce((prev, current) => {
      return (prev.audioBitrate || 0) > (current.audioBitrate || 0) ? prev : current;
    });

    res.json({
      videoId: videoId,
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      lengthSeconds: info.videoDetails.lengthSeconds,
      streamUrl: `/api/audio/stream/${videoId}`,
      format: {
        mimeType: format.mimeType,
        audioBitrate: format.audioBitrate,
        audioQuality: format.audioQuality
      }
    });

  } catch (error) {
    console.error('[Audio Info] Error:', error);
    res.status(500).json({
      error: 'Failed to get audio info',
      message: error.message
    });
  }
});

module.exports = router;
