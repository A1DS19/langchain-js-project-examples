import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { Document } from 'langchain/document';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { CharacterTextSplitter } from 'langchain/text_splitter';
import { client } from './utils/supabase-client';

// Example: https://js.langchain.com/docs/modules/indexes/document_loaders/examples/file_loaders/pdf
export default async function handler(req, res) {
  if (req.method === 'GET') {
    console.log('Inside the PDF handler');
    // Enter your code here
    /** STEP ONE: LOAD DOCUMENT */
    const bookPath =
      '/home/dev/projects/langchain/Langchain Course NextJS/main/data/document_loaders/naval-ravikant-book.pdf';
    const title = bookPath.split('/').slice(-1)[0];
    const pdfLoader = new PDFLoader(bookPath);
    const documents = await pdfLoader.load();

    if (!documents) {
      throw new Error('No documents');
    }
    // Chunk it
    const splitter = new CharacterTextSplitter({
      separator: ' ',
      chunkSize: 250,
      chunkOverlap: 10,
    });
    const splitDocuments = await splitter.splitDocuments(documents);

    // Reduce the size of the metadata
    const reducedDocuments = splitDocuments.map((doc) => {
      const reducedMetadata = { ...doc.metadata, title };
      delete reducedMetadata.pdf;
      return new Document({
        pageContent: doc.pageContent,
        metadata: reducedMetadata,
      });
    });

    /** STEP TWO: UPLOAD TO DATABASE */
    const embeddingsFunc = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const store = new SupabaseVectorStore(embeddingsFunc, {
      client,
      tableName: 'documents',
    });

    await store.addDocuments(reducedDocuments);

    // upload documents to Pinecone
    return res.status(200).json({ result: 200 });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
