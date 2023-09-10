import { ChatOpenAI } from 'langchain/chat_models/openai';
import { LLMChain } from 'langchain/chains';
import { ZeroShotAgent } from 'langchain/agents';
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from 'langchain/prompts';
import { AgentExecutor } from 'langchain/agents';
import SerpAPITool from '../tools/SerpAPI';
import WebBrowserTool from '../tools/WebBrowser';

const ResearchAgent = async (topic) => {
  try {
    const serp = SerpAPITool();
    const webBrowser = WebBrowserTool();

    const tools = [serp, webBrowser];

    const promptTemplate = ZeroShotAgent.createPrompt(tools, {
      prefix:
        'Answer the following questions about the topic, you have access to the following tools:',
      suffix: `Begin, answer consistently, and don't worry about making mistakes.`,
    });

    const chatPrompt = ChatPromptTemplate.fromPromptMessages([
      new SystemMessagePromptTemplate(promptTemplate),
      HumanMessagePromptTemplate.fromTemplate(`{input}`),
    ]);

    const chat = new ChatOpenAI({});

    const llmChain = new LLMChain({
      prompt: chatPrompt,
      llm: chat,
    });

    const agent = new ZeroShotAgent({
      llmChain: llmChain,
      allowedTools: tools.map((tool) => tool.name),
    });

    const executor = AgentExecutor.fromAgentAndTools({
      agent: agent,
      tools: tools,
      returnIntermediateSteps: false,
      maxIterations: 3,
      verbose: true,
    });

    const result = await executor.run(`who is ${topic}?`);

    return result;
  } catch (err) {
    console.error(err);
  }
};

export default ResearchAgent;
