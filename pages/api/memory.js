import { OpenAI } from 'langchain/llms/openai';
import { BufferMemory } from 'langchain/memory';
import { ConversationChain } from 'langchain/chains';

let model;
let memory;
let chain;
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { input, firstMsg } = req.body;

    if (!input) {
      res.status(400).json({ error: 'Missing input' });
    }

    // Initialize the model, memory, and chain on first message only!
    if (firstMsg) {
      model = new OpenAI({});
      memory = new BufferMemory();
      chain = new ConversationChain({
        llm: model,
        memory: memory,
      });
    }

    const response = await chain.call({ input });

    return res.status(200).json({ output: response });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
}
