import { client } from './utils/supabase-client';
import { VectorDBQAChain } from 'langchain/chains';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { OpenAI } from 'langchain/llms/openai';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';

// Example: https://js.langchain.com/docs/modules/indexes/document_loaders/examples/file_loaders/pdf
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    console.log('Query PDF');

    // Grab the user prompt
    const { input } = req.body;

    if (!input) {
      throw new Error('No input');
    }

    console.log('input received:', input);

    const llm = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const embeddings = new OpenAIEmbeddings();

    const funcFilterByCollection = (rpc) =>
      rpc.filter('metadata->>title', 'eq', 'naval-ravikant-book.pdf');

    // https://github.com/langchain-ai/langchainjs/issues/1795
    const store = new SupabaseVectorStore(embeddings, {
      client,
      tableName: 'documents',
      queryName: 'match_documents_new',
      filter: funcFilterByCollection,
    });

    const chain = VectorDBQAChain.fromLLM(llm, store, {
      k: 1,
      returnSourceDocuments: true,
    });

    const result = await chain.call({ query: input });

    return res.status(200).json({ result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}
