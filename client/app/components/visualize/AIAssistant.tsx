"use client";

import React, { useState, useRef, useEffect } from 'react';
import { SchemaGraph } from '../../lib/types';
import { askAI, ChatMessage } from '../../lib/api';

interface AIAssistantProps {
  graphData: SchemaGraph;
}

const SUGGESTIONS = [
  "Explain this schema",
  "What indexes should I add?",
  "Which table is most important?",
  "Find potential issues",
];

function FormattedMessage({ content }: { content: string }) {
  // Split on newlines, bold on **text**
  return (
    <div className="whitespace-pre-wrap">
      {content.split('\n').map((line, i) => (
        <span key={i}>
          {line.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={j} className="text-siesta-tan font-semibold">{part.slice(2,-2)}</strong>
              : part
          )}
          {i < content.split('\n').length - 1 && <br />}
        </span>
      ))}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="glass border border-grayzone/20 rounded-xl px-3 py-2">
        <span className="font-pixel text-[7px] text-stellar-strawberry block mb-1">DBLENS AI</span>
        <div className="flex gap-1 items-center h-3">
          {[0,1,2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 bg-grayzone rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AIAssistant({ graphData }: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (overrideMessage?: string) => {
    const text = (overrideMessage || input).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await askAI(graphData, messages, text);
      if (res.success && res.data) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.data!.reply }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Sorry, something went wrong: ${res.error?.message || 'Unknown error'}`,
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Failed to reach the AI assistant. Is the server running?',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => setMessages([]);

  return (
    <div className={`fixed left-0 top-1/2 -translate-y-1/2 flex items-center z-10 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-[320px]'}`}>
      {/* Panel body */}
      <div className="w-[320px] h-[calc(100vh-8rem)] glass-strong rounded-r-xl flex flex-col border border-grayzone/20">
        
        {/* Header */}
        <div className="p-4 border-b border-grayzone/20 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-pixel text-[10px] text-stellar-strawberry">AI ASSISTANT</h2>
            <p className="text-grayzone text-[9px] mt-0.5">Powered by Gemini</p>
          </div>
          <button
            onClick={clearChat}
            className="text-grayzone text-[9px] hover:text-siesta-tan transition-colors font-pixel"
          >
            CLEAR
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 no-scrollbar" ref={messagesEndRef}>
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col gap-2 mt-4">
              <p className="text-grayzone text-[10px] text-center mb-2">Ask a question or try a suggestion:</p>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  className="glass rounded-lg px-3 py-2 text-[9px] text-grayzone hover:text-stellar-strawberry hover:border-stellar-strawberry/40 border border-grayzone/20 cursor-pointer transition-colors font-pixel uppercase text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[11px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-stellar-strawberry/20 border border-stellar-strawberry/30 text-siesta-tan'
                  : 'glass border border-grayzone/20 text-siesta-tan'
              }`}>
                {msg.role === 'assistant' && (
                  <span className="font-pixel text-[7px] text-stellar-strawberry block mb-1">DBLENS AI</span>
                )}
                {/* Render with basic markdown — bold, line breaks */}
                <FormattedMessage content={msg.content} />
              </div>
            </div>
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-grayzone/20 flex-shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about your schema..."
              disabled={isLoading}
              rows={2}
              className="flex-1 glass border border-grayzone/30 rounded-lg p-2.5 text-[11px] text-siesta-tan placeholder:text-grayzone/50 resize-none focus:outline-none focus:border-stellar-strawberry transition-colors bg-transparent no-scrollbar"
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="px-3 py-2 bg-stellar-strawberry rounded-lg text-hei-se font-pixel text-[9px] hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              SEND
            </button>
          </div>
          <p className="text-grayzone/50 text-[8px] mt-1.5">Enter to send &middot; Shift+Enter for newline</p>
        </div>

      </div>

      {/* Always-visible pull tab — on the RIGHT edge of the panel */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass-strong border border-grayzone/20 rounded-r-lg px-1.5 py-4 flex flex-col items-center gap-2 hover:border-stellar-strawberry/40 transition-colors cursor-pointer"
      >
        <span className={`text-grayzone text-[10px] transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>◀</span>
        <span className="font-pixel text-[7px] text-grayzone" style={{writingMode: 'vertical-rl'}}>AI</span>
      </button>
    </div>
  );
}
