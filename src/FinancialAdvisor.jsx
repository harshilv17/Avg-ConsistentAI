import { useState, useEffect, useRef, useCallback } from 'react';

// ─── API Configuration ──────────────────────────────────────────────────────
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';


// ─── System Prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are a Stock Research Mentor — a calm, experienced equity 
advisor with 15 years of experience guiding beginner investors.

Your role is to teach users how to think like an investor 
by guiding them through a structured two-stage framework.
You never tell users what to buy.
You ask questions that make them arrive at conclusions themselves.
You behave like a senior mentor in a one-on-one conversation.
Warm. Patient. Intellectually curious. Never condescending.

CORE RULES

One question at a time. Always. Never stack questions.
Never give the answer before asking first.
If the user is wrong, nudge. Only reveal after 2 failed attempts.
Follow the framework stages in strict order. Never skip.
But keep tone warm and natural, not robotic.
If user digresses, acknowledge it, extract any signal, bridge back.
Never recommend a specific stock as a buy.
Track internally: which stage, which layer, what user has shared.

STAGE 1 — INVESTOR PERSONALITY PROFILING

Goal: Understand who the user is before any stock discussion.

Start by welcoming the user briefly. Tell them you need to 
understand them before looking at any stock. Then ask 
profiling questions one at a time in this order:

1. Why do you want to start investing? What is driving this?
2. What do you do — student, working, or something else?
3. When making decisions, do you decide quickly or research deeply?
4. What excites you more — steady growth over years, 
   or catching a big opportunity early even if risky?
5. If an investment dropped 30% before recovering, 
   would you hold or would that keep you up at night?

After enough signals, classify into one or a combination of:

Safety Seeker: wants stability, prefers large caps and dividends.
Growth Hunter: wants compounding, patient, analytical.
Opportunity Seeker: drawn to emerging sectors, higher risk tolerance.
Cash Flow Investor: values regular income, dividend businesses.

After classifying, reveal the personality type to the user.
Explain what it means. Tell them which sectors align.
Then ask what sector or type of business genuinely interests them.
Then transition to Stage 2.

STAGE 2 — 5-LAYER STOCK RESEARCH

Once a company is identified through conversation, walk through 
these 5 layers via Socratic questioning. One question at a time.

Layer 1 - Sector Analysis
Ask: Is this industry growing? Is the market large? 
Will it matter in 10 years? Are there strong tailwinds?
Teach only if stuck: sector tailwinds matter because even 
a mediocre company in a great industry can do well, 
but a great company in a dying industry will struggle.

Layer 2 - Business Model
Ask: How does this company make money? Is revenue recurring 
or one-time? Can it scale without costs growing proportionally? 
Does it have a moat?
Teach only if stuck: a scalable business with a moat 
is a compounding machine.

Layer 3 - Financial Strength
Guide through four metrics one at a time:
Revenue growth (healthy: 10-25% annually).
Net profit margin (strong: above 15%).
ROCE (excellent: above 20%).
Debt to equity (preferred: below 0.5).
Ask about each metric before explaining benchmarks.

Layer 4 - Management Quality
Ask: Who runs this company? Is promoter holding increasing 
or decreasing? Has strategy been consistent? 
How transparent is communication?
Teach only if stuck: great businesses fail under bad management. 
Increasing promoter stake signals confidence.

Layer 5 - Valuation
Ask: What does PE ratio mean to you? If PE is 60 vs 
industry average of 25, what does that signal?
Introduce PEG ratio (below 1.5 preferred).
Ask about free cash flow generation.
Teach only if stuck: you can love a company and overpay for it.
Valuation tells you if the price is fair, not if the business is good.

END OF SESSION

After all 5 layers, generate a Research Summary using 
this exact structure as your final message, formatted 
clearly with line breaks and labels:

RESEARCH SUMMARY
Investor Personality: [type]
Sector: [sector]
Company: [company name]
Layer 1 Sector: [user conclusion]
Layer 2 Business Model: [user conclusion]
Layer 3 Financials: [user conclusion]
Layer 4 Management: [user conclusion]
Layer 5 Valuation: [user conclusion]
Overall: [1-2 lines of the user's conclusion in their own voice]

End with: "This is your research, built through your own thinking. 
That is the only kind of conviction that holds when markets 
get difficult."

EDGE CASES

If user asks you to just tell them what to buy:
Acknowledge the temptation warmly and redirect. Explain that 
a tip without understanding is just noise. If they do not know 
why they bought something, they will panic when it drops. 
That is what we are building here — real conviction.

If user goes off topic:
Acknowledge it genuinely, find any relevant thread, bridge back.

If user seems overwhelmed:
Slow down. Revisit the concept more simply.

If user gives a strong answer:
Recognize it specifically and genuinely.

If asked about a company outside your knowledge:
Be honest. Offer to walk through the framework anyway.

FINAL PRINCIPLE

You are not Google. You are not a stock screener.
You are a mentor. Your success is not how much you told the user.
It is how much the user figured out themselves.
`;

// ─── Helper: Check if message is a Research Summary ─────────────────────────
function isResearchSummary(content) {
  return content.includes('RESEARCH SUMMARY');
}

// ─── Helper: Parse Research Summary ─────────────────────────────────────────
function parseResearchSummary(content) {
  const lines = content.split('\n');
  const result = {};
  const summaryStart = lines.findIndex(l => l.includes('RESEARCH SUMMARY'));
  if (summaryStart === -1) return null;
  
  for (let i = summaryStart; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('Investor Personality:')) result.personality = line.replace('Investor Personality:', '').trim();
    if (line.startsWith('Sector:')) result.sector = line.replace('Sector:', '').trim();
    if (line.startsWith('Company:')) result.company = line.replace('Company:', '').trim();
    if (line.startsWith('Layer 1')) result.layer1 = line.replace(/Layer 1[^:]*:/, '').trim();
    if (line.startsWith('Layer 2')) result.layer2 = line.replace(/Layer 2[^:]*:/, '').trim();
    if (line.startsWith('Layer 3')) result.layer3 = line.replace(/Layer 3[^:]*:/, '').trim();
    if (line.startsWith('Layer 4')) result.layer4 = line.replace(/Layer 4[^:]*:/, '').trim();
    if (line.startsWith('Layer 5')) result.layer5 = line.replace(/Layer 5[^:]*:/, '').trim();
    if (line.startsWith('Overall:')) result.overall = line.replace('Overall:', '').trim();
  }
  
  const closingIdx = lines.findIndex(l => l.includes('your own thinking'));
  if (closingIdx !== -1) result.closing = lines[closingIdx].trim();

  return result;
}

// ─── Research Summary Card Component ────────────────────────────────────────
function ResearchSummaryCard({ content }) {
  const data = parseResearchSummary(content);
  if (!data) return null;

  const layers = [
    { icon: '🏭', label: 'Sector Analysis', value: data.layer1 },
    { icon: '💼', label: 'Business Model', value: data.layer2 },
    { icon: '📊', label: 'Financials', value: data.layer3 },
    { icon: '👤', label: 'Management', value: data.layer4 },
    { icon: '💰', label: 'Valuation', value: data.layer5 },
  ];

  return (
    <div className="my-4 rounded-2xl overflow-hidden shadow-lg border border-indigo-100" style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #faf9f7 100%)' }}>
      <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">📋</div>
          <div>
            <h3 className="text-white font-bold text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>Research Summary</h3>
            <p className="text-indigo-100 text-sm">Your investment research, in your own words</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 flex flex-wrap gap-4 border-b border-indigo-100/60">
        {data.personality && (
          <div className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-xl">
            <span className="text-lg">🧠</span>
            <div>
              <p className="text-xs text-indigo-400 font-medium">Personality</p>
              <p className="text-sm font-semibold text-indigo-700">{data.personality}</p>
            </div>
          </div>
        )}
        {data.sector && (
          <div className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-xl">
            <span className="text-lg">📈</span>
            <div>
              <p className="text-xs text-orange-400 font-medium">Sector</p>
              <p className="text-sm font-semibold text-orange-700">{data.sector}</p>
            </div>
          </div>
        )}
        {data.company && (
          <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-xl">
            <span className="text-lg">🏢</span>
            <div>
              <p className="text-xs text-green-500 font-medium">Company</p>
              <p className="text-sm font-semibold text-green-700">{data.company}</p>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 space-y-3">
        {layers.map((layer, i) => (
          layer.value && (
            <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100">
              <span className="text-xl mt-0.5">{layer.icon}</span>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{layer.label}</p>
                <p className="text-sm text-gray-700 mt-0.5">{layer.value}</p>
              </div>
            </div>
          )
        ))}
      </div>

      {data.overall && (
        <div className="mx-6 mb-4 p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, #fef3c7, #fef9c3)' }}>
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Overall Conclusion</p>
          <p className="text-sm text-amber-900 font-medium">{data.overall}</p>
        </div>
      )}

      {data.closing && (
        <div className="px-6 pb-5">
          <p className="text-sm text-indigo-500 italic text-center">"{data.closing}"</p>
        </div>
      )}
    </div>
  );
}

// ─── Typing Indicator Component ─────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fadeUp">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>
        <span className="text-white font-bold text-xs">SM</span>
      </div>
      <div className="px-5 py-4 rounded-2xl rounded-tl-md bg-white border border-gray-100 shadow-sm">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble Component ───────────────────────────────────────────────
function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const isSummary = !isUser && isResearchSummary(message.content);

  if (isSummary) {
    return (
      <div className="flex items-start gap-3 animate-fadeUp">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>
          <span className="text-white font-bold text-xs">SM</span>
        </div>
        <div className="flex-1 max-w-[85%]">
          <ResearchSummaryCard content={message.content} />
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex justify-end animate-fadeUp">
        <div className="max-w-[75%] px-5 py-3.5 rounded-2xl rounded-br-md text-white text-sm leading-relaxed shadow-md" style={{ fontFamily: "'DM Sans', sans-serif", background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)' }}>
          {message.content.split('\n').map((line, i) => (
            <span key={i}>{line}{i < message.content.split('\n').length - 1 && <br />}</span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 animate-fadeUp">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>
        <span className="text-white font-bold text-xs">SM</span>
      </div>
      <div className="max-w-[80%] px-5 py-3.5 rounded-2xl rounded-tl-md bg-white border border-gray-100 shadow-sm text-sm leading-relaxed text-gray-800" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {message.content.split('\n').map((line, i) => {
          const parts = line.split(/(\*\*[^*]+\*\*)/g);
          return (
            <span key={i}>
              {parts.map((part, j) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={j} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
                }
                return part;
              })}
              {i < message.content.split('\n').length - 1 && <br />}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main App Component ─────────────────────────────────────────────────────
export default function FinancialAdvisor() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Inject fonts + custom animations (Tailwind is now installed via PostCSS)
  useEffect(() => {
    if (!document.querySelector('link[href*="Playfair"]')) {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    if (!document.querySelector('#stockmentor-styles')) {
      const style = document.createElement('style');
      style.id = 'stockmentor-styles';
      style.textContent = `
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeUp { animation: fadeUp 0.35s ease-out forwards; }
        
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          50% { box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.1); }
        }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }

        textarea::-webkit-scrollbar { width: 4px; }
        textarea::-webkit-scrollbar-track { background: transparent; }
        textarea::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }

        .chat-scroll::-webkit-scrollbar { width: 6px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 6px; }
        .chat-scroll::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `;
      document.head.appendChild(style);
    }

    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.background = '#faf9f7';
    document.body.style.fontFamily = "'DM Sans', sans-serif";
  }, []);


  // Auto-scroll
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  // Send message
  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || isLoading) return;

    setError(null);
    const userMsg = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...newMessages,
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `API error (${response.status})`);
      }

      const data = await response.json();
      const aiContent = data.choices?.[0]?.message?.content;

      if (aiContent) {
        setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([]);
    setInput('');
    setError(null);
    setIsLoading(false);
  };

  const starterPrompts = [
    "I'm new to investing and want to learn how to research stocks",
    "I've been investing casually and want a better framework",
    "Help me analyze a company I'm interested in",
  ];

  const hasMessages = messages.length > 0;


  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ background: '#faf9f7', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="px-6 py-3.5 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: '#ede9e2', background: '#ffffff' }}>
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>
            <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              StockMentor
            </h1>
            <p className="text-xs leading-tight" style={{ color: '#999' }}>AI-powered research coach</p>
          </div>
        </div>

        {/* Center: Mentor status */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse-glow"></div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Your Research Mentor</p>
            <p className="text-xs text-green-500 font-medium leading-tight">Online</p>
          </div>
        </div>

        {/* Right: Clear button */}
        <button 
          onClick={resetChat}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:bg-gray-100 active:scale-95"
          style={{ color: '#666666' }}
          title="Reset conversation"
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Clear Chat
          </span>
        </button>
      </div>

      {/* ─── Chat Messages ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 chat-scroll" style={{ background: '#faf9f7' }}>
        <div className="max-w-3xl mx-auto space-y-5">
          {!hasMessages ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                Learn to Think Like an Investor
              </h2>
              <p className="text-sm mb-8 leading-relaxed max-w-md" style={{ color: '#666666' }}>
                I'll guide you through understanding your investor personality and researching stocks using a proven 5-layer framework. No tips — just real understanding.
              </p>

              <div className="flex flex-col gap-3 w-full max-w-lg">
                {starterPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="group w-full text-left px-5 py-3.5 rounded-xl border text-sm transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50/50 hover:shadow-sm active:scale-[0.98]"
                    style={{ borderColor: '#ede9e2', color: '#1a1a1a', background: '#ffffff' }}
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 text-sm group-hover:bg-indigo-100 transition-colors">
                        {i === 0 ? '🌱' : i === 1 ? '📐' : '🔍'}
                      </span>
                      <span className="font-medium">{prompt}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}
              {isLoading && <TypingIndicator />}
              {error && (
                <div className="flex items-start gap-3 animate-fadeUp">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-sm">⚠️</div>
                  <div className="px-5 py-3.5 rounded-2xl rounded-tl-md bg-red-50 border border-red-100 text-sm text-red-600">
                    {error}
                    <button 
                      onClick={() => { setError(null); sendMessage(messages[messages.length - 1]?.content); }}
                      className="ml-2 underline font-medium hover:text-red-700"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* ─── Input Area ──────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-t flex-shrink-0" style={{ borderColor: '#ede9e2', background: '#ffffff' }}>
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response..."
              rows={1}
              disabled={isLoading}
              className="w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                borderColor: '#ede9e2', 
                background: '#faf9f7', 
                color: '#1a1a1a',
                fontFamily: "'DM Sans', sans-serif",
                maxHeight: '150px',
              }}
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: '#1a1a1a' }}
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs mt-2" style={{ color: '#999' }}>
          Press Enter to send · Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
