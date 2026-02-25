import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

// ── PASTE YOUR GROQ API KEY HERE ──────────────────────────────────────────────
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL   = "llama-3.3-70b-versatile"; // or mixtral-8x7b-32768

const SYSTEM_PROMPT = `You are an AI Financial Advisory Assistant.
Your role is to provide structured, educational, and principle-based financial guidance.
You do NOT provide guaranteed returns.
You do NOT give speculative stock tips.
You do NOT fabricate real-time market data.
You operate strictly using the provided financial knowledge context.

CORE RULES
1. Use ONLY the knowledge context provided below.
2. Do NOT invent statistics, performance data, or predictions.
3. If the user does not provide enough details (risk appetite, capital, time horizon), assume a moderate-risk investor with a 5+ year time horizon and clearly state this assumption.
4. Never guarantee profits.
5. Avoid hype language like "best sector", "sure-shot returns", "guaranteed gains".
6. Always include a professional risk disclaimer at the end of each response.
7. Keep tone analytical, calm, and professional.
8. Format your responses clearly with sections when appropriate.

FINANCIAL KNOWLEDGE CONTEXT

[SECTOR EVALUATION]
When evaluating sectors for investment, consider:
- Macroeconomic environment (interest rates, inflation, policy trends)
- Growth potential, Cyclical vs defensive nature, Valuation levels, Risk exposure

High-Growth Sectors: Technology, Renewable Energy, Digital Infrastructure - higher growth potential, higher volatility.
Defensive Sectors: FMCG / Consumer Staples, Healthcare, Utilities - more stable during economic downturns.
Cyclical Sectors: Real Estate, Automobiles, Capital Goods - perform well during expansion but decline during slowdown.
No sector is universally superior; suitability depends on risk appetite and time horizon.

[TRADING VS INVESTING]
Trading: Short-term strategy, focus on price movements, requires active monitoring, higher emotional pressure, higher short-term risk.
Investing: Long-term wealth creation, based on fundamentals, benefits from compounding, lower stress and turnover.
Disciplined long-term investing is generally more suitable for sustainable wealth building.

[ASSET ALLOCATION PRINCIPLES]
Conservative Profile: 20-30% Equity, 70-80% Debt / Fixed Income
Moderate Profile: 40-60% Equity, 40-60% Debt
Aggressive Profile: 70-90% Equity, 10-30% Debt
Younger investors with longer time horizons can typically allocate more toward equities.
Diversification across sectors reduces concentration risk.

[RISK MANAGEMENT]
Risk depends on: time horizon, stability of income, emotional tolerance, liquidity needs.
Risk management strategies: Diversification, Position sizing, Avoid over-leverage, Maintain emergency fund, Periodic rebalancing.
Higher expected returns come with higher volatility.`;

const SUGGESTED_QUESTIONS = [
  "Which sectors should I invest in right now?",
  "How should I split funds between trading and investing?",
  "What allocation suits a moderate risk profile?",
  "How do I manage risk in my portfolio?",
];

const INFO_CARDS = [
  { icon: "📈", label: "Growth Sectors",      desc: "Tech, Renewables, Digital Infra" },
  { icon: "🛡️", label: "Defensive Sectors",   desc: "FMCG, Healthcare, Utilities"     },
  { icon: "⚖️", label: "Moderate Allocation", desc: "40-60% Equity / 40-60% Debt"    },
];

export default function FinancialAdvisor() {
  const [messages, setMessages]         = useState([]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  async function sendMessage(text) {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");

    const userMsg    = { role: "user", content: userText };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setLoading(true);

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization : `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model      : GROQ_MODEL,
          messages   : [{ role: "system", content: SYSTEM_PROMPT }, ...newHistory],
          temperature: 0.5,
          max_tokens : 1024,
        }),
      });

      const data  = await res.json();
      const reply = data.choices?.[0]?.message?.content ||
                    "I could not process that. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Check your API key and try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  /* ── palette ── */
  const C = {
    bg      : "#faf9f7",
    white   : "#ffffff",
    border  : "#ede9e2",
    borderHov:"#c9c0b0",
    ink     : "#1a1a1a",
    inkMid  : "#555555",
    inkSoft : "#888888",
    inkFaint: "#aaaaaa",
    accent  : "#6366f1",
    accentLt: "rgba(99,102,241,0.12)",
    surface : "#f5f3ef",
    orange  : "#f97316",
    green   : "#22c55e",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; font-family: 'DM Sans', sans-serif; }
        @keyframes bounce {
          0%,80%,100% { transform: translateY(0);    opacity:.35; }
          40%         { transform: translateY(-6px); opacity:1;   }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        .fa-msg { animation: fadeUp .28s ease forwards; }
        .fa-card:hover  { border-color:${C.borderHov} !important; box-shadow:0 4px 16px rgba(0,0,0,.06) !important; }
        .fa-sug:hover   { border-color:${C.borderHov} !important; background:${C.surface} !important; }
        .fa-send:hover  { background:#333 !important; }
        .fa-send:active { transform:scale(.93); }
        .fa-send:disabled { opacity:.4; cursor:not-allowed; }
        .fa-input:focus-within { border-color:${C.borderHov} !important; }
        .fa-link { color:${C.inkMid}; cursor:pointer; transition:color .15s; }
        .fa-link:hover { color:${C.ink}; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#ddd8cf; border-radius:4px; }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 { margin-top: .6em; margin-bottom: .4em; font-family: 'Playfair Display', serif; color: ${C.ink}; line-height: 1.3; }
        .markdown-content h3 { font-size: 1.15em; }
        .markdown-content p { margin-bottom: .8em; }
        .markdown-content p:last-child { margin-bottom: 0; }
        .markdown-content ul, .markdown-content ol { margin-left: 1.4em; margin-bottom: .8em; padding-left: 0.5em; }
        .markdown-content li { margin-bottom: .3em; }
        .markdown-content strong { font-weight: 700; color: ${C.ink}; }
      `}</style>

      <div style={{ fontFamily:"'DM Sans',sans-serif", background:C.bg, minHeight:"100vh", display:"flex", flexDirection:"column" }}>

        {/* ── NAV ───────────────────────────────────────────────────────────── */}
        <nav style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0 40px", height:64,
          background:"rgba(250,249,247,.88)", backdropFilter:"blur(14px)",
          borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, zIndex:100,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{
              width:32, height:32, background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
              borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16,
            }}>💹</div>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:C.ink, letterSpacing:"-.3px" }}>
              FinAdvisor AI
            </span>
          </div>
          <ul style={{ display:"flex", gap:32, listStyle:"none" }}>
            {["Home","Portfolio","Markets","About"].map(l => (
              <li key={l} className="fa-link" style={{ fontSize:14, fontWeight:500 }}>{l}</li>
            ))}
          </ul>
          <button style={{
            background:C.ink, color:"#fff", border:"none", padding:"10px 22px",
            borderRadius:100, fontSize:14, fontWeight:600, cursor:"pointer",
            display:"flex", alignItems:"center", gap:6,
          }}>
            Get Started &nbsp;→
          </button>
        </nav>

        {/* ── LAYOUT ────────────────────────────────────────────────────────── */}
        <div style={{
          display:"grid", gridTemplateColumns:"310px 1fr", flex:1,
          maxWidth:1280, margin:"0 auto", width:"100%",
          padding:"40px 40px", gap:28,
        }}>

          {/* LEFT */}
          <aside style={{ display:"flex", flexDirection:"column", gap:28 }}>

            {/* Hero */}
            <div style={{ position:"relative" }}>
              <div style={{
                position:"absolute", width:240, height:240,
                background:"radial-gradient(circle, rgba(253,186,116,.32) 0%, rgba(251,146,60,.08) 55%, transparent 72%)",
                borderRadius:"50%", top:-50, left:-50, pointerEvents:"none", zIndex:0,
              }}/>
              <p style={{ fontSize:11, fontWeight:700, letterSpacing:".15em", color:"#9c7d4e", textTransform:"uppercase", marginBottom:12, position:"relative", zIndex:1 }}>
                AI-Powered Advisory
              </p>
              <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:34, lineHeight:1.15, color:C.ink, fontWeight:700, marginBottom:14, position:"relative", zIndex:1 }}>
                Building{" "}
                <span style={{ color:C.accent, fontStyle:"italic" }}>Financial Clarity</span>{" "}
                for everyone
              </h1>
              <p style={{ fontSize:14, lineHeight:1.7, color:C.inkMid, position:"relative", zIndex:1 }}>
                Structured, principle-based guidance — from sector evaluation to asset allocation — powered by AI.
              </p>
            </div>

            {/* Badges */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {["Principle-Based","No Speculation","Risk-Aware"].map(s => (
                <div key={s} style={{
                  display:"flex", alignItems:"center", gap:6,
                  fontSize:12, fontWeight:600, color:C.inkMid,
                  background:C.white, border:`1px solid ${C.border}`,
                  borderRadius:100, padding:"5px 12px",
                }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:C.orange, flexShrink:0, display:"block" }}/>
                  {s}
                </div>
              ))}
            </div>

            {/* Info cards */}
            <div>
              <p style={{ fontSize:11, fontWeight:700, letterSpacing:".12em", color:C.inkFaint, textTransform:"uppercase", marginBottom:12 }}>
                Are you asking about…
              </p>
              {INFO_CARDS.map(c => (
                <div
                  key={c.label}
                  className="fa-card"
                  onClick={() => sendMessage(`Tell me about ${c.label}`)}
                  style={{
                    background:C.white, border:`1px solid ${C.border}`, borderRadius:16,
                    padding:"15px 18px", display:"flex", alignItems:"center", gap:14,
                    cursor:"pointer", transition:"border-color .2s, box-shadow .2s", marginBottom:8,
                  }}
                >
                  <div style={{
                    width:40, height:40, background:C.surface, borderRadius:10,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0,
                  }}>{c.icon}</div>
                  <div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:14, color:C.ink, marginBottom:2 }}>{c.label}</div>
                    <div style={{ fontSize:12, color:C.inkSoft }}>{c.desc}</div>
                  </div>
                  <span style={{ marginLeft:"auto", color:"#ccc", fontSize:18 }}>›</span>
                </div>
              ))}
            </div>
          </aside>

          {/* RIGHT — CHAT */}
          <div style={{
            background:C.white, border:`1px solid ${C.border}`, borderRadius:24,
            display:"flex", flexDirection:"column", overflow:"hidden",
            boxShadow:"0 2px 24px rgba(0,0,0,.04)", minHeight:600,
          }}>
            {/* Chat header */}
            <div style={{
              padding:"18px 28px", borderBottom:`1px solid ${C.border}`,
              display:"flex", alignItems:"center", justifyContent:"space-between",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{
                  width:38, height:38, background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
                  borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18,
                }}>🤖</div>
                <div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:16, color:C.ink }}>Financial Advisor</div>
                  <div style={{ fontSize:12, color:C.inkFaint, display:"flex", alignItems:"center", gap:4 }}>
                    <span style={{ width:7, height:7, borderRadius:"50%", background:C.green, display:"inline-block" }}/>
                    Ready to assist
                  </div>
                </div>
              </div>
              <button
                onClick={() => setMessages([])}
                style={{
                  background:"none", border:`1px solid ${C.border}`, borderRadius:8,
                  padding:"6px 14px", fontSize:12, cursor:"pointer",
                  color:C.inkSoft, fontFamily:"'DM Sans',sans-serif", fontWeight:600,
                }}
              >
                Clear chat
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex:1, overflowY:"auto", padding:"28px 28px 16px", display:"flex", flexDirection:"column", gap:20 }}>
              {messages.length === 0 && !loading ? (
                /* Empty state */
                <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"40px 20px", gap:24 }}>
                  <div style={{
                    width:64, height:64, background:C.accentLt,
                    borderRadius:18, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28,
                  }}>💬</div>
                  <div>
                    <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:C.ink, marginBottom:8 }}>
                      Ask me anything
                    </h2>
                    <p style={{ fontSize:14, color:C.inkSoft, lineHeight:1.65, maxWidth:340 }}>
                      Get structured, principle-based financial guidance — from sector evaluation to fund allocation.
                    </p>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, width:"100%", maxWidth:480 }}>
                    {SUGGESTED_QUESTIONS.map(q => (
                      <button
                        key={q}
                        className="fa-sug"
                        onClick={() => sendMessage(q)}
                        style={{
                          background:C.bg, border:`1px solid ${C.border}`, borderRadius:12,
                          padding:"12px 14px", fontSize:13, color:"#444", cursor:"pointer",
                          textAlign:"left", lineHeight:1.45, fontFamily:"'DM Sans',sans-serif",
                          fontWeight:500, transition:"border-color .2s, background .2s",
                        }}
                      >{q}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((m, i) => (
                    <div key={i} className="fa-msg" style={{
                      display:"flex",
                      justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                      gap:10, alignItems:"flex-end",
                    }}>
                      {m.role === "assistant" && (
                        <div style={{
                          width:28, height:28, borderRadius:"50%",
                          background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:13, flexShrink:0,
                        }}>🤖</div>
                      )}
                      <div className={m.role === "assistant" ? "markdown-content" : ""} style={{
                        maxWidth:"76%", padding:"13px 17px",
                        borderRadius: m.role === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                        background: m.role === "user" ? C.ink : C.surface,
                        color: m.role === "user" ? "#fff" : "#2a2a2a",
                        fontSize:14, lineHeight:1.72, whiteSpace: m.role === "user" ? "pre-wrap" : "normal", wordBreak:"break-word",
                      }}>
                        {m.role === "assistant" ? (
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        ) : (
                          m.content
                        )}
                      </div>
                      {m.role === "user" && (
                        <div style={{
                          width:28, height:28, borderRadius:"50%", background:"#e5e1d8",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:12, fontWeight:700, color:C.inkMid, flexShrink:0,
                        }}>U</div>
                      )}
                    </div>
                  ))}
                  {loading && (
                    <div className="fa-msg" style={{ display:"flex", justifyContent:"flex-start", gap:10, alignItems:"flex-end" }}>
                      <div style={{
                        width:28, height:28, borderRadius:"50%",
                        background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0,
                      }}>🤖</div>
                      <div style={{
                        display:"flex", gap:5, padding:"14px 18px",
                        background:C.surface, borderRadius:"20px 20px 20px 4px",
                      }}>
                        {[0,1,2].map(i => (
                          <div key={i} style={{
                            width:7, height:7, background:"#aaa", borderRadius:"50%",
                            animation:`bounce 1.1s ${i*.18}s infinite ease-in-out`,
                          }}/>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* Input */}
            <div style={{ padding:"14px 24px 20px", borderTop:`1px solid ${C.border}` }}>
              <div
                className="fa-input"
                style={{
                  display:"flex", gap:10, background:C.bg,
                  border:`1px solid ${C.border}`, borderRadius:16,
                  padding:"8px 8px 8px 18px", alignItems:"flex-end",
                  transition:"border-color .2s",
                }}
              >
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="Ask about sectors, allocation, risk management…"
                  style={{
                    flex:1, border:"none", background:"transparent", resize:"none",
                    fontSize:14, fontFamily:"'DM Sans',sans-serif", color:C.ink,
                    outline:"none", lineHeight:1.6, maxHeight:120, padding:"6px 0",
                  }}
                />
                <button
                  className="fa-send"
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  style={{
                    width:40, height:40, background:C.ink, border:"none",
                    borderRadius:10, cursor:"pointer", display:"flex",
                    alignItems:"center", justifyContent:"center", flexShrink:0,
                    transition:"background .2s, transform .1s", color:"#fff", fontSize:16,
                  }}
                >↑</button>
              </div>
              <p style={{ fontSize:11, color:"#bbb", marginTop:8, textAlign:"center" }}>
                Enter to send · Shift+Enter for new line · Educational guidance only
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
