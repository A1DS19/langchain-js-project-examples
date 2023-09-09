'use client';
import React, { useState } from 'react';
import '../globals.css';
import Title from '../components/Title';
import TwoColumnLayout from '../components/TwoColumnLayout';
import PageHeader from '../components/PageHeader';
import ResultWithSources from '../components/ResultWithSources';
import PromptBox from '../components/PromptBox';

const page = () => {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([
    {
      text: "Hi there! What's your name and favorite food?",
      type: 'bot',
    },
  ]);
  const [firstMsg, setFirstMsg] = useState(true);

  const handlePromptChange = (e) => {
    setPrompt(e.target.value);
  };

  const handleSubmitPrompt = async () => {
    try {
      setPrompt('');
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: prompt, firstMsg }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }

      const searchRes = await response.json();

      if (searchRes) {
        setMessages((prev) => [
          ...prev,
          { text: prompt, type: 'user', sourceDocuments: null },
          { text: searchRes.output.response, type: 'bot', sourceDocuments: null },
        ]);
        setFirstMsg(false);
      }
    } catch (error) {
      console.error(error);
      setError(error);
    }
  };
  return (
    <>
      <Title emoji={':brain emoji'} headingText={'Memory'} />
      <TwoColumnLayout
        leftChildren={
          <>
            <PageHeader
              heading='I remember everything'
              boldText="Let's see if it can remember your name and favorite food. This tool will let you ask anything contained in a PDF document. "
              description='This tool uses Buffer Memory and Conversation Chain.  Head over to Module X to get started!'
            />
          </>
        }
        rightChildren={
          <>
            <ResultWithSources messages={messages} pngFile='brain' />
            <PromptBox
              prompt={prompt}
              handleSubmit={handleSubmitPrompt}
              handlePromptChange={handlePromptChange}
              placeHolderText={'Ask me anything!'}
              error={error}
            />
          </>
        }
      />
    </>
  );
};

export default page;
