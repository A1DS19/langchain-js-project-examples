/**
 * This endpoint is used to load the resumes into the chain, then upload them to the Pinecone database.
 * Tutorial: https://js.langchain.com/docs/modules/indexes/document_loaders/examples/file_loaders/directory
 * Summarization: https://js.langchain.com/docs/modules/chains/other_chains/summarization
 * Dependencies: npm install pdf-parse
 */

import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { OpenAI } from 'langchain/llms/openai';
import { VectorDBQAChain } from 'langchain/chains';
import { PromptTemplate } from 'langchain/prompts';
import { client } from './utils/supabase-client';

export default async function handler(req, res) {
  try {
    const { prompt } = req.body;
    const model = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      temperature: 0.7,
    });
    // const vectorStore = SupabaseVectorStore.fromExistingIndex(new OpenAIEmbeddings(), {
    //   client,
    //   tableName: 'documents',
    //   queryName: 'match_documents_new',
    // });

    // https://github.com/langchain-ai/langchainjs/issues/1795

    const funcFilterByCollection = (rpc) =>
      rpc.filter('metadata->>docType', 'eq', 'resume');

    const embeddings = new OpenAIEmbeddings();

    const vectorStore = new SupabaseVectorStore(embeddings, {
      client,
      tableName: 'documents',
      queryName: 'match_documents_new',
      filter: funcFilterByCollection,
    });

    const chain = VectorDBQAChain.fromLLM(model, vectorStore, {
      k: 1,
      returnSourceDocuments: true,
    });

    const promptTemplate = new PromptTemplate({
      template: 'Answer this question: {question}',
      inputVariables: ['question'],
    });

    const formattedPrompt = await promptTemplate.format({
      question: prompt,
    });

    const response = await chain.call({
      query: formattedPrompt,
    });

    return res.status(200).json({
      output: response.text,
      sourceDocuments: response.sourceDocuments,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error' });
  }
}
