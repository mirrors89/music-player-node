const { google } = require('googleapis');
const axios = require('axios');

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

class YouTubeService {
  /**
   * Search YouTube for videos
   */
  static async search(query, maxResults = 5) {
    try {
      if (!process.env.YOUTUBE_API_KEY) {
        console.warn('YouTube API key not configured. Search functionality disabled.');
        return [];
      }

      const response = await youtube.search.list({
        part: 'snippet',
        q: query,
        maxResults: maxResults,
        type: 'video',
        videoCategoryId: '10' // Music category
      });

      const videoIds = response.data.items.map(item => item.id.videoId);
      
      // Get video details including duration
      const detailsResponse = await youtube.videos.list({
        part: 'contentDetails,snippet',
        id: videoIds.join(',')
      });

      return detailsResponse.data.items.map(item => ({
        videoId: item.id,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails.medium.url,
        duration: item.contentDetails.duration
      }));
    } catch (error) {
      console.error('YouTube search error:', error.message);
      return [];
    }
  }

  /**
   * Get video details from YouTube API
   */
  static async getVideoDetails(videoId) {
    try {
      if (!process.env.YOUTUBE_API_KEY) {
        console.warn('YouTube API key not configured. Using oEmbed fallback.');
        return this.getVideoDetailsFromOEmbed(videoId);
      }

      const response = await youtube.videos.list({
        part: 'snippet,contentDetails',
        id: videoId
      });

      if (!response.data.items || response.data.items.length === 0) {
        return null;
      }

      const item = response.data.items[0];
      return {
        videoId: item.id,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails.medium.url,
        duration: item.contentDetails.duration
      };
    } catch (error) {
      console.error('YouTube API error, falling back to oEmbed:', error.message);
      return this.getVideoDetailsFromOEmbed(videoId);
    }
  }

  /**
   * Get video details from YouTube oEmbed API (free, no API key needed)
   */
  static async getVideoDetailsFromOEmbed(videoId) {
    try {
      const response = await axios.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      
      return {
        videoId: videoId,
        title: response.data.title,
        channelTitle: response.data.author_name,
        thumbnailUrl: response.data.thumbnail_url,
        duration: null // oEmbed doesn't provide duration
      };
    } catch (error) {
      console.error('YouTube oEmbed error:', error.message);
      return null;
    }
  }

  /**
   * Extract video ID from various YouTube URL formats
   */
  static extractVideoId(input) {
    if (!input) return null;

    // If it's already a video ID (11 characters)
    const directIdPattern = /^[a-zA-Z0-9_-]{11}$/;
    if (directIdPattern.test(input)) {
      return input;
    }

    // YouTube URL patterns
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }
}

module.exports = YouTubeService;
