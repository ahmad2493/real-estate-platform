import React, { useState } from 'react';
import { ragAPI } from '../services/api';
import ReactMarkdown from 'react-markdown';
import { MessageCircle, X, Send, User, Bot } from 'lucide-react';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi 👋 I'm Estatify assistant. How can I help you today?",
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      text: inputMessage,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInputMessage('');

    // Call your FastAPI RAG endpoint
    try {
      const data = await ragAPI.query(inputMessage); // This calls /rag_query
      const botResponse = {
        id: messages.length + 2,
        text: data.answer || "Sorry, I couldn't process your request.",
        isBot: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: messages.length + 2,
          text: "Sorry, I couldn't process your request.",
          isBot: true,
          timestamp: new Date(),
        },
      ]);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={toggleChat}
        className={`fixed bottom-12 right-6 w-14 h-14 rounded-full shadow-lg transition-all duration-300 z-50 flex items-center justify-center ${
          isOpen ? 'bg-red-500 hover:bg-red-600 rotate-180' : 'bg-black hover:bg-gray-800'
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat Sidebar */}
      <div
        className={`fixed right-0 w-[32rem] bg-white border-l border-gray-200 shadow-2xl transform transition-transform duration-300 z-40 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ top: '80px', height: 'calc(100vh - 80px)' }}
      >
        {/* Header */}
        <div className="bg-black text-white p-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Estatify Assistant</h3>
            <p className="text-sm text-gray-300">Ready to help</p>
          </div>
          <button onClick={toggleChat} className="text-white hover:text-gray-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Container */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{ height: 'calc(100vh - 230px)' }}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.isBot ? 'justify-start' : 'justify-end'
              }`}
            >
              {message.isBot && (
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}

              <div
                className={`max-w-[350px] p-3 rounded-lg ${
                  message.isBot
                    ? 'bg-gray-100 text-gray-800 rounded-tl-none'
                    : 'bg-black text-white rounded-tr-none ml-auto'
                }`}
              >
                {message.isBot ? (
                  <ReactMarkdown>{message.text}</ReactMarkdown>
                ) : (
                  <p className="text-sm leading-relaxed">{message.text}</p>
                )}
                <span
                  className={`text-xs mt-1 block ${
                    message.isBot ? 'text-gray-500' : 'text-gray-300'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {!message.isBot && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              onKeyPress={(e) => e.key === 'Enter' && sendMessage(e)}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim()}
              className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={toggleChat}
          className="fixed inset-0 bg-black bg-opacity-25 z-30 transition-opacity duration-300"
        />
      )}
    </>
  );
};

export default Chatbot;
