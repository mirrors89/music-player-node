const YouTubeService = require('./youtubeService');

class SlackCommandHandler {
  constructor(slackApp, playlistService) {
    this.slackApp = slackApp;
    this.playlistService = playlistService;

    if (this.slackApp) {
      this.registerCommands();
    }
  }

  registerCommands() {
    // Command 1: /add-music - Direct URL/Video ID addition
    this.slackApp.command('/add-music', async ({ command, ack, say }) => {
      await ack();

      try {
        const input = command.text.trim();
        const videoId = YouTubeService.extractVideoId(input);

        if (!videoId) {
          await say({
            text: '올바른 YouTube URL 또는 비디오 ID를 입력해주세요.',
            response_type: 'ephemeral'
          });
          return;
        }

        // Get video details
        const videoDetails = await YouTubeService.getVideoDetails(videoId);

        if (!videoDetails) {
          await say({
            text: '비디오 정보를 가져올 수 없습니다.',
            response_type: 'ephemeral'
          });
          return;
        }

        // Add to playlist with requester info
        const requester = {
          userId: command.user_id,
          userName: command.user_name
        };
        const song = this.playlistService.addSong(videoDetails, requester);

        // Post confirmation (visible to everyone in channel)
        await say({
          text: `플레이리스트에 추가되었습니다!`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${song.title}*\n${song.channelTitle}\n재생 순서: ${song.playOrder}\n신청자: ${song.requestedByUserName}`
              },
              accessory: song.thumbnailUrl ? {
                type: 'image',
                image_url: song.thumbnailUrl,
                alt_text: song.title
              } : undefined
            }
          ]
        });
      } catch (error) {
        console.error('Error in /add-music command:', error);
        await say({
          text: '플레이리스트에 추가하는 중 오류가 발생했습니다.',
          response_type: 'ephemeral'
        });
      }
    });

    // Command 2: /search-music - YouTube search
    this.slackApp.command('/search-music', async ({ command, ack }) => {
      try {
        const query = command.text.trim();

        if (!query) {
          await ack({
            text: '검색어를 입력해주세요.',
            response_type: 'ephemeral'
          });
          return;
        }

        const results = await YouTubeService.search(query, 5);

        if (results.length === 0) {
          await ack({
            text: '검색 결과가 없습니다.',
            response_type: 'ephemeral'
          });
          return;
        }

        // Create blocks for each result
        const blocks = [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*"${query}" 검색 결과:*`
            }
          },
          {
            type: 'divider'
          }
        ];

        results.forEach(result => {
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${result.title}*\n${result.channelTitle}`
            },
            accessory: {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '플레이리스트에 추가'
              },
              style: 'primary',
              action_id: `add_to_playlist_${result.videoId}`,
              value: result.videoId
            }
          });
        });

        await ack({
          text: `"${query}" 검색 결과`,
          blocks: blocks,
          response_type: 'ephemeral'
        });
      } catch (error) {
        console.error('Error in /search-music command:', error);
        await ack({
          text: 'YouTube 검색 중 오류가 발생했습니다.',
          response_type: 'ephemeral'
        });
      }
    });

    // Command 3: /playlist - View current playlist
    this.slackApp.command('/playlist', async ({ command, ack, respond }) => {
      try {
        const allSongs = this.playlistService.getAllSongs();

        if (allSongs.length === 0) {
          await ack({
            text: '플레이리스트가 비어있습니다.',
            response_type: 'ephemeral'
          });
          return;
        }

        // Separate unplayed and played songs
        const unplayedSongs = allSongs.filter(song => !song.isPlayed);
        const playedSongs = allSongs.filter(song => song.isPlayed);

        let text = '';

        // Show unplayed songs
        if (unplayedSongs.length > 0) {
          text += '*📋 대기 중인 곡:*\n\n';
          const displayUnplayed = unplayedSongs.slice(0, 10);
          displayUnplayed.forEach(song => {
            const requester = song.requestedByUserName ? ` (신청: ${song.requestedByUserName})` : '';
            text += `${song.playOrder}. ${song.title} - ${song.channelTitle}${requester}\n`;
          });
          if (unplayedSongs.length > 10) {
            text += `\n...외 ${unplayedSongs.length - 10}개\n`;
          }
        }

        // Show played songs
        if (playedSongs.length > 0) {
          text += '\n*✅ 재생 완료:*\n\n';
          const displayPlayed = playedSongs.slice(-5).reverse(); // Show last 5 played songs
          displayPlayed.forEach(song => {
            const requester = song.requestedByUserName ? ` (신청: ${song.requestedByUserName})` : '';
            text += `~~${song.playOrder}. ${song.title} - ${song.channelTitle}${requester}~~\n`;
          });
          if (playedSongs.length > 5) {
            text += `\n...외 ${playedSongs.length - 5}개\n`;
          }
        }

        text += `\n*총 ${unplayedSongs.length}곡 대기 중, ${playedSongs.length}곡 재생 완료*`;

        await ack({
          text: text,
          response_type: 'ephemeral'
        });
      } catch (error) {
        console.error('Error in /playlist command:', error);
        await ack({
          text: '플레이리스트를 조회하는 중 오류가 발생했습니다.',
          response_type: 'ephemeral'
        });
      }
    });

    // Button action handler: Add to playlist from search results
    this.slackApp.action(/^add_to_playlist_/, async ({ action, ack, body, respond, say }) => {
      try {
        await ack();
        console.log('[Button Action] add_to_playlist triggered');
        console.log('[Button Action] Video ID:', action.value);
        console.log('[Button Action] User:', body.user);

        const videoId = action.value;

        // Get full video details
        const videoDetails = await YouTubeService.getVideoDetails(videoId);

        if (!videoDetails) {
          console.error('[Button Action] Failed to get video details for:', videoId);
          await respond({
            text: '비디오 정보를 가져올 수 없습니다.',
            response_type: 'ephemeral',
            replace_original: true
          });
          return;
        }

        // Add to playlist with requester info
        const requester = {
          userId: body.user.id,
          userName: body.user.username || body.user.name
        };
        console.log('[Button Action] Adding song with requester:', requester);

        const song = this.playlistService.addSong(videoDetails, requester);
        console.log('[Button Action] Song added successfully:', song.id);

        // Update the original search message to show it was added
        await respond({
          text: `✅ 추가 완료: ${song.title}`,
          response_type: 'ephemeral',
          replace_original: true
        });

        // Post confirmation (visible to everyone in channel)
        await say({
          text: `플레이리스트에 추가되었습니다!`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${song.title}*\n${song.channelTitle}\n재생 순서: ${song.playOrder}\n신청자: ${song.requestedByUserName}`
              },
              accessory: song.thumbnailUrl ? {
                type: 'image',
                image_url: song.thumbnailUrl,
                alt_text: song.title
              } : undefined
            }
          ]
        });
      } catch (error) {
        console.error('[Button Action] Error in button action handler:', error);
        console.error('[Button Action] Error stack:', error.stack);
        try {
          await respond({
            text: '플레이리스트에 추가하는 중 오류가 발생했습니다: ' + error.message,
            response_type: 'ephemeral',
            replace_original: true
          });
        } catch (respondError) {
          console.error('[Button Action] Failed to send error response:', respondError);
        }
      }
    });

    console.log('Slack commands registered successfully');
  }
}

module.exports = SlackCommandHandler;
