// /pages/api/resume_upload.js
// Import dependencies

/**
 * This endpoint is used to load the resumes into the chain, then upload them to the Pinecone database.
 * Tutorial: https://js.langchain.com/docs/modules/indexes/document_loaders/examples/file_loaders/directory
 * Summarization: https://js.langchain.com/docs/modules/chains/other_chains/summarization
 * Dependencies: npm install pdf-parse
 */

import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { CharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { PineconeClient } from '@pinecone-database/pinecone';
import { loadSummarizationChain } from 'langchain/chains';
import { OpenAI } from 'langchain/llms/openai';
import { Document } from 'langchain/document';
import { client } from './utils/supabase-client';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';

export default async function handler(req, res) {
  // Grab the prompt from the url (?prompt=[value])
  //   console.log(process.env.PINECONE_API_KEY);
  //   console.log(process.env.PINECONE_ENVIRONMENT);
  //   console.log(process.env.PINECONE_INDEX);
  // Always use a try catch block to do asynchronous requests and catch any errors
  try {
    const dirPath =
      '/home/dev/projects/langchain/Langchain Course NextJS/main/data/resumes';

    const dirLoader = new DirectoryLoader(dirPath, {
      '.pdf': (path) => new PDFLoader(path, '/pdf'),
    });

    const docs = await dirLoader.load();

    const splitter = new CharacterTextSplitter({
      separator: ' ',
      chunkSize: 200,
      chunkOverlap: 20,
    });

    const splitDocuments = await splitter.splitDocuments(docs);

    const reducedDocuments = splitDocuments.map((doc) => {
      const reducedMetadata = {
        ...doc.metadata,
        title: doc.metadata.source.split('/').pop(),
        docType: 'resume',
      };
      delete reducedMetadata.pdf;
      return new Document({
        pageContent: doc.pageContent,
        metadata: reducedMetadata,
      });
    });

    const model = new OpenAI({
      temperature: 0,
    });

    const summaries = [];

    // summarize all documents together
    const summarizeChain = loadSummarizationChain(model, {
      type: 'map_reduce',
    });

    const summarizeResponse = await summarizeChain.call({
      input_documents: docs,
    });

    summaries.push({ summary: summarizeResponse.text });

    // summarize each document individually
    for (const doc of docs) {
      const summarizeChainOne = loadSummarizationChain(model, {
        type: 'map_reduce',
      });

      const summarizeResponseOne = await summarizeChainOne.call({
        input_documents: [doc],
      });

      summaries.push({ summary: summarizeResponseOne.text });
    }

    const embeddingsFunc = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // upload documents to Supabase V1
    // const store = new SupabaseVectorStore(embeddingsFunc, {
    //   client,
    //   tableName: 'documents',
    // });

    // await store.addDocuments(reducedDocuments);

    // upload documents to Supabase V2
    await SupabaseVectorStore.fromDocuments(reducedDocuments, embeddingsFunc, {
      client,
      tableName: 'documents',
      queryName: 'match_documents_new',
    });

    const summaryString = JSON.stringify(summaries, null, 2);
    return res.status(200).json({ output: summaryString });
  } catch (err) {
    // If we have an error

    console.error(err);
    return res.status(500).json({ error: err });
  }
}
