import axios from 'axios';

export default async function getVideoMetaData(videoId) {
  // enable api key and setup next.config.js
  const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${process.env.GOOGLE_API_KEY}&part=snippet,contentDetails,statistics,status`;

  try {
    const response = await axios.get(url);
    const { data } = response;
    const { items } = data;
    const metadata = items[0];

    const videoTitle = metadata?.snippet.title;
    const videoDescription = metadata?.snippet.description;
    const shortenedDescription = videoDescription?.split('.')[0];

    const videoId = metadata?.id;
    const shortMetadata = {
      videoId,
      videoTitle,
      shortenedDescription,
    };

    return shortMetadata;
  } catch (err) {
    console.error(`Failed to get metadata: ${err}`);
  }
}
