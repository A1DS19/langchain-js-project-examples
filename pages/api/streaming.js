import { OpenAI } from 'langchain/llms/openai';
import SSE from 'express-sse';

const sse = new SSE();

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { input } = req.body;

    if (!input) {
      throw new Error('No input');
    }
    // Initialize model
    const llm = new OpenAI({
      streaming: true,
      callbacks: [
        {
          handleLLMNewToken(token) {
            sse.send(token, 'newToken');
          },
        },
      ],
    });

    // create the prompt
    const prompt = `Create a short rap about my name and city, make it funny and uplifting.\n\nName: ${input}`;

    // call frontend to backend
    llm.call(prompt).then(() => {
      sse.send(null, 'end');
    });

    return res.status(200).json({ result: 'Streaming complete' });
  } else if (req.method === 'GET') {
    sse.init(req, res);
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
