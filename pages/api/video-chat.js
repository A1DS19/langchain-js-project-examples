// /pages/api/transcript.js
import { YoutubeTranscript } from 'youtube-transcript';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { loadSummarizationChain, ConversationalRetrievalQAChain } from 'langchain/chains';
// import { HNSWLib } from 'langchain/vectorstores/hnswlib';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { CharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAI } from 'langchain';
import { client } from './utils/supabase-client';

// Global variables
let chain;
const chatHistory = [];

// DO THIS SECOND

//const initializeChain_summarize = async (initialPrompt, transcript, prompt) => {
//   try {
//     const embeddingsFunc = new OpenAIEmbeddings({
//       apiKey: process.env.OPENAI_API_KEY,
//     });

//     const funcFilter = (rpc) => rpc.filter('metadata->>video_url', 'eq', prompt);

//     const store = new SupabaseVectorStore(embeddingsFunc, {
//       client,
//       tableName: 'documents',
//     });

//     const chat = new ChatOpenAI({
//       temperature: 0.8,
//       modelName: 'gpt-3.5-turbo',
//     });

//     const docs = [
//       {
//         pageContent: transcript,
//         metadata: {
//           video_url: prompt,
//         },
//       },
//     ];

//     await store.addDocuments(docs);

//     const doc = await store.similaritySearch(transcript, 1, funcFilter);

//     chain = loadSummarizationChain(chat, { type: 'map_reduce' });

//     const response = await chain.call({
//       input_documents: doc,
//     });

//     console.log(response);

//     chatHistory.push({
//       role: 'assistant',
//       content: response.text,
//     });

//     return response;
//   } catch (error) {
//     console.error(error);
//   }
// };

const initializeChain = async (transcript, prompt) => {
  try {
    const embeddingsFunc = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const funcFilter = (rpc) => rpc.filter('metadata->>video_url', 'eq', prompt);

    const store = new SupabaseVectorStore(embeddingsFunc, {
      client,
      tableName: 'documents',
    });

    const chat = new ChatOpenAI({
      temperature: 0.8,
      modelName: 'gpt-3.5-turbo',
    });

    const docs = [
      {
        pageContent: transcript,
        metadata: {
          video_url: prompt,
        },
      },
    ];

    await store.addDocuments(docs);

    const chain = ConversationalRetrievalQAChain.fromLLM(
      chat,
      store.asRetriever(1, funcFilter),
      chatHistory
    );

    const response = await chain.call({
      question: `Give a summary of the transcript ${transcript}`,
      chat_history: chatHistory,
    });

    chatHistory.push({
      role: 'assistant',
      content: response.text,
    });

    return response;
  } catch (error) {
    console.error(error);
  }
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // DO THIS FIRST
    const { prompt, firstMsg } = req.body;

    // Then if it's the first message, we want to initialize the chain, since it doesn't exist yet
    if (firstMsg) {
      try {
        // Initialize the chain
        const initialPrompt = `Give me a summary of this transcript: ${prompt}`;

        chatHistory.push({
          role: 'user',
          content: initialPrompt,
        });

        const transcript = await YoutubeTranscript.fetchTranscript(prompt);

        if (!transcript) {
          return res.status(500).json({ error: 'Error fetching transcript' });
        }

        let sanitizedTranscript = '';
        transcript.forEach((line) => {
          sanitizedTranscript += line.text;
        });

        const response = await initializeChain(sanitizedTranscript, prompt);

        return res.status(200).json({ output: response, chatHistory });
      } catch (err) {
        console.error(err);
        return res
          .status(500)
          .json({ error: 'An error occurred while fetching transcript' });
      }

      // do this third!
    } else {
      // If it's not the first message, we can chat with the bot
      try {
        console.log({ prompt, firstMsg });
        chatHistory.push({
          role: 'user',
          content: prompt,
        });

        const funcFilter = (rpc) => rpc.filter('metadata->>video_url', 'eq', prompt);

        const embeddingsFunc = new OpenAIEmbeddings({
          apiKey: process.env.OPENAI_API_KEY,
        });

        const chat = new ChatOpenAI({
          temperature: 0.8,
          modelName: 'gpt-3.5-turbo',
        });

        const store = new SupabaseVectorStore(embeddingsFunc, {
          client,
          tableName: 'documents',
        });

        const chain = ConversationalRetrievalQAChain.fromLLM(
          chat,
          store.asRetriever(1, funcFilter),
          chatHistory
        );

        const response = await chain.call({
          question: prompt,
          chat_history: chatHistory,
        });

        chatHistory.push({
          role: 'assistant',
          content: response.text,
        });

        return res.status(200).json({ output: response, chatHistory });
      } catch (error) {
        // Generic error handling
        console.error(error);
        res.status(500).json({ error: 'An error occurred during the conversation.' });
      }
    }
  }
}
