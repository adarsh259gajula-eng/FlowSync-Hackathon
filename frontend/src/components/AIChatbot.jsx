import { useState, useRef, useEffect } from "react";

export default function AIChatbot({ currentContext }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm **FlowSync AI**, your real-time traffic engineering and mobility assistant. Ask me about intersection congestion, Webster signal optimization, commute delays, or eco savings!",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: query,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const candidateUrls = [
        typeof window !== "undefined" && window.location.hostname ? `http://${window.location.hostname}:8000/api/chat` : null,
        "http://localhost:8000/api/chat",
        "/api/chat"
      ].filter(Boolean);

      let res = null;
      let lastErr = null;

      for (const url of candidateUrls) {
        try {
          res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: history,
              context: currentContext || null,
            }),
          });
          if (res && res.ok) break;
        } catch (e) {
          lastErr = e;
        }
      }

      if (!res || !res.ok) {
        throw new Error(lastErr?.message || "Failed to reach backend");
      }

      const data = await res.json();
      const aiReply = data.reply || "I couldn't process that query. Please try again.";

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: aiReply,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I had trouble connecting to the traffic analysis AI server. Please make sure the backend is active.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const QUICK_PROMPTS = [
    "Explain Webster signal optimization",
    "How does delay reduction save fuel?",
    "Why is traffic high at 08:17?",
    "What is the optimal phase split?",
  ];

  return (
    <aside className="ai-chatbot-root" aria-label="FlowSync AI Assistant">
      {/* Improvised Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          className="ai-chat-trigger"
          onClick={() => setIsOpen(true)}
          aria-expanded={isOpen}
          title="Chat with FlowSync AI Traffic Assistant"
        >
          <div className="ai-trigger-sparkle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z" fill="url(#sparkle-grad)" />
              <defs>
                <linearGradient id="sparkle-grad" x1="3" y1="2" x2="21" y2="20" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FDE047" />
                  <stop offset="1" stopColor="#F59E0B" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="ai-trigger-label">Ask FlowSync AI</span>
          <span className="ai-trigger-status" aria-hidden="true">
            <span className="ai-status-ring" />
            <span className="ai-status-core" />
          </span>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="ai-chat-window" role="dialog" aria-modal="false" aria-labelledby="ai-chat-title">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-header-info">
              <div className="ai-avatar-icon" aria-hidden="true">🤖</div>
              <div>
                <h3 id="ai-chat-title" className="ai-chat-title">FlowSync AI Assistant</h3>
                <div className="ai-chat-status">
                  <span className="ai-status-indicator" />
                  <span>Traffic Intelligence Active</span>
                </div>
              </div>
            </div>
            <div className="ai-chat-header-actions">
              <button
                type="button"
                className="ai-chat-btn-icon"
                onClick={() =>
                  setMessages([
                    {
                      id: "welcome",
                      role: "assistant",
                      content:
                        "Chat cleared. How can I assist you with your traffic optimization analysis today?",
                      time: new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                    },
                  ])
                }
                title="Clear chat"
                aria-label="Clear chat"
              >
                🗑️
              </button>
              <button
                type="button"
                className="ai-chat-btn-icon"
                onClick={() => setIsOpen(false)}
                title="Minimize chat"
                aria-label="Minimize chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="ai-chat-body">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`ai-message-row ${msg.role === "user" ? "user-row" : "ai-row"}`}
              >
                {msg.role === "assistant" && (
                  <div className="ai-msg-avatar" aria-hidden="true">🚦</div>
                )}
                <div className={`ai-message-bubble ${msg.role === "user" ? "user-bubble" : "ai-bubble"}`}>
                  <div className="ai-message-text">{msg.content}</div>
                  <span className="ai-message-time">{msg.time}</span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="ai-message-row ai-row">
                <div className="ai-msg-avatar" aria-hidden="true">🚦</div>
                <div className="ai-message-bubble ai-bubble ai-typing-bubble">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div className="ai-quick-prompts">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="ai-prompt-chip"
                onClick={() => handleSend(prompt)}
                disabled={isLoading}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="ai-chat-footer">
            <textarea
              className="ai-chat-input"
              rows="1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about traffic, Webster timing, delay..."
              disabled={isLoading}
            />
            <button
              type="button"
              className="ai-send-btn"
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              title="Send message"
              aria-label="Send message"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
