import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import "./AIAssistant.css";

// ── Smart Local Fallback Knowledge Base (Offline / Instant) ──
const FABRIC_RULES = [
  { keywords: ["silk", "silku", "பட்டு", "resham"], service: "Dry Cleaning", reason: "Silk is delicate — water or harsh detergents damage silk proteins and luster", icon: "👗", tip: "Always dry clean pure silk sarees and festive blouses", actionUrl: "/services" },
  { keywords: ["wool", "woolen", "sweater", "jacket", "blazer", "cardigan"], service: "Dry Cleaning", reason: "Wool fibers shrink under water agitation — dry cleaning maintains tailored structure", icon: "🧥", tip: "Store woolens in breathable garment bags after cleaning", actionUrl: "/services" },
  { keywords: ["cotton", "shirt", "t-shirt", "pant", "jeans", "denim", "பருத்தி"], service: "Wash & Fold", reason: "Cotton and denim are durable and machine-washable at 30°C", icon: "👔", tip: "Wash at 30–40°C with mild detergent to prevent fading", actionUrl: "/services" },
  { keywords: ["linen", "handloom", "கதர்"], service: "Wash & Fold", reason: "Linen cleans best in cold or lukewarm water with gentle agitation", icon: "🌿", tip: "Steam press while slightly damp for that crisp luxury texture", actionUrl: "/services" },
  { keywords: ["bedsheet", "pillow", "blanket", "comforter", "duvet", "curtain"], service: "Wash & Fold (KG Service)", reason: "Bedding & drapes are most economical by weight (KG pricing)", icon: "🛏️", tip: "Wash bedsheets every 1–2 weeks for optimal hygiene", actionUrl: "/services" },
  { keywords: ["iron", "press", "wrinkle", "crease", "தேய்த்தல்"], service: "Ironing Service", reason: "Hand steam-pressing ensures sharp creases without fabric shine or burns", icon: "♨️", tip: "We hand-press on industrial vacuum tables", actionUrl: "/services" },
  { keywords: ["stain", "curry", "turmeric", "tea", "coffee", "oil", "grease", "ink", "blood"], service: "Dry Cleaning + Stain Treatment", reason: "Stains require targeted enzyme pre-treatment. Do not rub vigorously!", icon: "🫧", tip: "Dab gently with cold water — heat permanently sets proteins", actionUrl: "/services" },
  { keywords: ["baby", "kids", "infant"], service: "Wash & Fold (Gentle)", reason: "Baby clothes need hypoallergenic, fragrance-free detergents with dual rinses", icon: "🍼", tip: "We use dermatologist-tested mild detergents for infants", actionUrl: "/services" },
  { keywords: ["shoe", "sneaker", "boot"], service: "Shoe Cleaning", reason: "Specialized deep foam scrubbing, stain removal, and antibacterial UV deodorization", icon: "👟", tip: "Professional clean every 2–3 months keeps shoes fresh", actionUrl: "/services" },
  { keywords: ["express", "fast", "urgent", "same day", "today", "வேகம்"], service: "Express Wash", reason: "Guaranteed 6-hour delivery turnaround for orders booked before 12 PM", icon: "⚡", tip: "Perfect for emergencies or travel laundry", actionUrl: "/services" }
];

const QUICK_PROMPTS = [
  { label: "🚚 Track My Order", query: "Where is my order?" },
  { label: "🧺 Services & Rates", query: "What are your services and prices?" },
  { label: "💳 My Wallet Balance", query: "Check my wallet balance" },
  { label: "⚡ 6h Express Service", query: "Tell me about express wash" },
  { label: "👗 Silk Saree Care", query: "How to clean silk sarees?" },
  { label: "🫧 Stain Removal", query: "How do you treat curry and oil stains?" }
];

export default function AIAssistant() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { walletBalance } = useWallet();

  const [open, setOpen]         = useState(false);
  const [input, setInput]       = useState("");
  const [messages, setMessages] = useState([
    {
      from: "ai",
      text: "Hello! 👋 I'm your **LaundTime AI Care Assistant**.\n\nI can track your real-time orders, check your wallet, recommend services, or give expert fabric care tips.\n\nHow can I help you today?",
      time: new Date()
    }
  ]);
  const [typing, setTyping]     = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN";

      recognition.onstart = () => setListening(true);
      recognition.onend   = () => setListening(false);
      recognition.onerror = () => setListening(false);
      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          sendMessage(transcript);
        }
      };

      recognitionRef.current = recognition;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleVoice = () => {
    if (!speechSupported || !recognitionRef.current) {
      alert("Voice input is not supported in this browser. Please use Google Chrome or Edge.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Speech recognition error:", err);
      }
    }
  };

  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, messages, typing]);

  // Client-side smart analysis fallback
  const analyseClientSide = useCallback((text) => {
    const lower = text.toLowerCase();

    // Wallet balance
    if (lower.includes("wallet") || lower.includes("balance") || lower.includes("என் பணம்")) {
      return {
        reply: `💰 **Your Current Wallet Balance:** ₹${walletBalance || 0}\n\nYou can use your wallet for 1-click checkout on any laundry order.`,
        actionText: "+ Recharge Wallet",
        actionUrl: "/wallet"
      };
    }

    // Fabric rules
    for (const rule of FABRIC_RULES) {
      if (rule.keywords.some(k => lower.includes(k))) {
        return {
          reply: `${rule.icon} **Recommended: ${rule.service}**\n\n${rule.reason}.\n\n💡 **Tip:** ${rule.tip}`,
          actionText: `Book ${rule.service} →`,
          actionUrl: rule.actionUrl || "/services"
        };
      }
    }

    // Pricing
    if (lower.includes("price") || lower.includes("rate") || lower.includes("cost") || lower.includes("how much") || lower.includes("எவ்வளவு")) {
      return {
        reply: "🏷️ **LaundTime Transparent Pricing List:**\n\n• **Wash & Fold:** ₹50–60/kg\n• **Dry Cleaning:** ₹120/piece\n• **Ironing Service:** ₹40/kg or ₹20/piece\n• **Shoe Cleaning:** ₹50/pair\n• **Express Wash (6h):** ₹100/kg\n\n*Free doorstep pickup & delivery on orders above ₹199!*",
        actionText: "💎 View Full Pricing & Plans",
        actionUrl: "/pricing"
      };
    }

    // Default friendly answer
    return {
      reply: "I'm here to help! Ask me to:\n• *Track an order* (enter your Tracking ID like `LT...`)\n• *Fabric advice* ('How to wash silk sarees?')\n• *Pricing & timing* ('What are your rates?')\n• *Wallet balance* ('Check my balance')",
      actionText: "🧺 Browse Services",
      actionUrl: "/services"
    };
  }, [walletBalance]);

  const sendMessage = async (overrideText) => {
    const msg = (overrideText !== undefined ? overrideText : input).trim();
    if (!msg) return;
    setInput("");

    setMessages(prev => [...prev, { from: "user", text: msg, time: new Date() }]);
    setTyping(true);

    try {
      // 1. Try Backend Live AI Chat Route
      const res = await fetch("http://localhost:5001/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          userId: user?._id || user?.id,
          userPhone: user?.phone
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [
          ...prev,
          {
            from: "ai",
            text: data.reply,
            actionText: data.actionText,
            actionUrl: data.actionUrl,
            partnerPhone: data.partnerPhone,
            time: new Date()
          }
        ]);
      } else {
        throw new Error("Backend response error");
      }
    } catch {
      // 2. Fallback to Client-side Knowledge Engine
      const fallbackResult = analyseClientSide(msg);
      setMessages(prev => [
        ...prev,
        {
          from: "ai",
          text: fallbackResult.reply,
          actionText: fallbackResult.actionText,
          actionUrl: fallbackResult.actionUrl,
          time: new Date()
        }
      ]);
    } finally {
      setTyping(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleActionClick = (url) => {
    if (url.startsWith("http")) {
      window.open(url, "_blank");
    } else {
      navigate(url);
      setOpen(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        from: "ai",
        text: "Conversation cleared. How can I help you today? Ask me about order tracking, fabric care, or laundry pricing!",
        time: new Date()
      }
    ]);
  };

  // Formats text with bullet points, bolding, and line breaks
  const formatText = (text) => {
    if (!text) return null;
    return text.split("\n").map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={i} className="ai-line">
          {parts.map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={j}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
          <br />
        </span>
      );
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        className={`ai-fab ${open ? "open" : ""}`}
        onClick={() => setOpen(o => !o)}
        title="LaundTime AI Assistant"
      >
        <span className="ai-fab-icon">{open ? "✕" : "🤖"}</span>
        {!open && <span className="ai-fab-label">AI Assistant</span>}
        {!open && <span className="ai-fab-dot"></span>}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="ai-chat-window">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-avatar">🤖</div>
            <div className="ai-chat-meta">
              <div className="ai-chat-title">LaundTime AI Care</div>
              <div className="ai-chat-status">
                <span className="live-pulse"></span> Online · Live Sync
              </div>
            </div>
            <div className="ai-header-actions">
              <button
                className="ai-header-btn"
                onClick={clearChat}
                title="Clear conversation"
              >
                🗑️
              </button>
              <button
                className="ai-header-btn close"
                onClick={() => setOpen(false)}
                title="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="ai-messages">
            {messages.map((m, i) => (
              <div key={i} className={`ai-bubble-wrap ${m.from}`}>
                {m.from === "ai" && <div className="ai-bubble-avatar">🤖</div>}
                <div className={`ai-bubble ${m.from}`}>
                  <div className="ai-bubble-text">{formatText(m.text)}</div>

                  {/* Interactive Action Button */}
                  {m.actionText && m.actionUrl && (
                    <button
                      onClick={() => handleActionClick(m.actionUrl)}
                      className="ai-action-btn"
                    >
                      {m.actionText} →
                    </button>
                  )}

                  {/* Click-to-call assigned partner if provided */}
                  {m.partnerPhone && (
                    <a
                      href={`tel:${m.partnerPhone}`}
                      className="ai-call-partner-btn"
                    >
                      📞 Call Partner: {m.partnerPhone}
                    </a>
                  )}

                  <div className="ai-bubble-time">
                    {new Date(m.time).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {typing && (
              <div className="ai-bubble-wrap ai">
                <div className="ai-bubble-avatar">🤖</div>
                <div className="ai-bubble ai typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="ai-quick-container">
            <div className="ai-quick-scroll">
              {QUICK_PROMPTS.map((q, i) => (
                <button
                  key={i}
                  className="ai-quick-btn"
                  onClick={() => sendMessage(q.query)}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Row with Voice Recognition */}
          <div className="ai-input-row">
            <input
              ref={inputRef}
              className="ai-input"
              placeholder={listening ? "🎙️ Listening... speak now" : "Ask anything (e.g. track order, silk care)..."}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={listening}
            />

            {speechSupported && (
              <button
                type="button"
                className={`ai-voice-btn ${listening ? "listening" : ""}`}
                onClick={toggleVoice}
                title={listening ? "Stop listening" : "Speak your question"}
              >
                {listening ? "🛑" : "🎙️"}
              </button>
            )}

            <button
              className="ai-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim()}
              title="Send Message"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
