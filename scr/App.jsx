import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are Haven, a warm and knowledgeable AI home finding assistant. Your job is to have a natural conversation with homebuyers to understand exactly what they're looking for.

Once you have enough information (at minimum: city/location, budget, and bedroom count), extract their criteria and output it in this exact format at the END of your message:

<SEARCH>
{"city": "Austin", "state": "TX", "minBeds": 3, "maxPrice": 400000, "minBaths": 2}
</SEARCH>

Rules:
- city and state are required before you output SEARCH
- maxPrice is required before you output SEARCH
- minBeds is required before you output SEARCH
- If you don't have all three yet, ask naturally for what's missing — one question at a time
- Keep responses short, warm, and conversational
- Don't output SEARCH until you have city, state, maxPrice, and minBeds
- state should always be the 2-letter abbreviation`;

export default function Haven() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey! I'm Haven 🏡 Tell me what you're looking for — city, budget, bedrooms, must-haves. The more you share, the better I can match you." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState(null);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingError, setListingError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, listings, listingsLoading]);

  const fetchListings = async (criteria) => {
    setListingsLoading(true);
    setListings(null);
    setListingError(null);

    try {
      const params = new URLSearchParams();
      if (criteria.city) params.append("city", criteria.city);
      if (criteria.state) params.append("state", criteria.state);
      if (criteria.minBeds) params.append("bedroomsMin", criteria.minBeds);
      if (criteria.maxPrice) params.append("priceMax", criteria.maxPrice);
      if (criteria.minBaths) params.append("bathroomsMin", criteria.minBaths);

      // Call our own Netlify function — no CORS issues
      const res = await fetch(`/.netlify/functions/listings?${params.toString()}`);

      if (!res.ok) throw new Error(`Error ${res.status}`);

      const data = await res.json();
      const results = Array.isArray(data) ? data : (data.data || []);
      setListings(results);
    } catch (err) {
      setListingError(err.message);
      setListings([]);
    }
    setListingsLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      const raw = data.content?.[0]?.text || "Sorry, I had trouble with that.";
      const searchMatch = raw.match(/<SEARCH>([\s\S]*?)<\/SEARCH>/);
      const cleanText = raw.replace(/<SEARCH>[\s\S]*?<\/SEARCH>/g, "").trim();

      setMessages(prev => [...prev, { role: "assistant", content: cleanText }]);

      if (searchMatch) {
        try {
          const criteria = JSON.parse(searchMatch[1].trim());
          fetchListings(criteria);
        } catch (e) {}
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again!" }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatPrice = (p) => p ? `$${Number(p).toLocaleString()}` : "Price N/A";

  return (
    <div style={{ minHeight: "100vh", background: "#0f0d0a", fontFamily: "Georgia, serif", color: "#f0ebe3", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #2a2520", padding: "14px 22px", display: "flex", alignItems: "center", gap: 12, background: "#110f0c", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #c9a96e, #8b6914)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏡</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: "bold", color: "#e8d5b0" }}>Haven</div>
          <div style={{ fontSize: 10, color: "#7a6d5a", letterSpacing: "0.08em", textTransform: "uppercase" }}>AI Home Finder · Live Listings</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade8088" }} />
          <span style={{ fontSize: 11, color: "#7a6d5a" }}>Connected</span>
        </div>
      </div>

      {/* Chat */}
      <div style={{ flex: 1, overflowY: "auto", padding: "22px 18px", maxWidth: 740, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", animation: "fadeUp 0.3s ease" }}>
            {msg.role === "assistant" && (
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #c9a96e, #8b6914)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, marginRight: 9, flexShrink: 0, marginTop: 3 }}>🏡</div>
            )}
            <div style={{ maxWidth: "76%", padding: "11px 16px", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: msg.role === "user" ? "#c9a96e18" : "#1c1915", border: `1px solid ${msg.role === "user" ? "#c9a96e33" : "#2a2520"}`, fontSize: 15, lineHeight: 1.65, color: msg.role === "user" ? "#e8d5b0" : "#d4c9b8" }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #c9a96e, #8b6914)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🏡</div>
            <div style={{ padding: "11px 16px", borderRadius: "18px 18px 18px 4px", background: "#1c1915", border: "1px solid #2a2520", display: "flex", gap: 5, alignItems: "center" }}>
              {[0,1,2].map(d => <div key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: "#c9a96e", animation: "bounce 1s ease infinite", animationDelay: `${d*0.2}s` }} />)}
            </div>
          </div>
        )}

        {listingsLoading && (
          <div style={{ background: "#1a1713", border: "1px solid #2a2520", borderRadius: 16, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>🔍</div>
            <div style={{ color: "#c9a96e", fontSize: 14 }}>Searching live listings...</div>
          </div>
        )}

        {listingError && (
          <div style={{ background: "#1a1713", border: "1px solid #8b291422", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "#e8705a" }}>
            ⚠️ {listingError}
          </div>
        )}

        {listings && listings.length > 0 && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c9a96e", marginBottom: 12 }}>
              ✦ {listings.length} Live Listings Found
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {listings.map((home, idx) => (
                <div key={home.id || idx} style={{ background: "#1a1713", border: "1px solid #2a2520", borderRadius: 16, overflow: "hidden", animation: `fadeUp 0.4s ease ${idx*0.07}s both`, transition: "border-color 0.2s", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#c9a96e55"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#2a2520"}>
                  <div style={{ height: 155, background: "#1e1a15", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                    {home.photoUrls?.[0]
                      ? <img src={home.photoUrls[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ textAlign: "center" }}><div style={{ fontSize: 32 }}>🏠</div><div style={{ fontSize: 11, color: "#3a3530", marginTop: 4 }}>No photo</div></div>
                    }
                    <div style={{ position: "absolute", top: 10, right: 10, background: "#0f0d0acc", border: "1px solid #c9a96e44", borderRadius: 20, padding: "3px 10px", fontSize: 11, color: "#c9a96e" }}>
                      {home.status || "Active"}
                    </div>
                  </div>
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: "bold", color: "#e8d5b0", lineHeight: 1.3 }}>{home.formattedAddress || home.addressLine1 || "Address unavailable"}</div>
                        <div style={{ fontSize: 11, color: "#7a6d5a", marginTop: 2 }}>{home.city}{home.state ? `, ${home.state}` : ""} {home.zipCode}</div>
                      </div>
                      <div style={{ fontSize: 17, fontWeight: "bold", color: "#c9a96e", flexShrink: 0 }}>{formatPrice(home.price || home.listPrice)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 12, color: "#9a8d7a", flexWrap: "wrap" }}>
                      {home.bedrooms && <span>🛏 {home.bedrooms} bed</span>}
                      {home.bathrooms && <span>🚿 {home.bathrooms} bath</span>}
                      {home.squareFootage && <span>📐 {Number(home.squareFootage).toLocaleString()} sqft</span>}
                      {home.yearBuilt && <span>📅 {home.yearBuilt}</span>}
                    </div>
                    {home.daysOnMarket !== undefined && (
                      <div style={{ fontSize: 11, color: "#4a4035", marginTop: 6 }}>{home.daysOnMarket === 0 ? "Listed today" : `${home.daysOnMarket} days on market`}</div>
                    )}
                    <button style={{ marginTop: 12, width: "100%", padding: 9, borderRadius: 10, background: "linear-gradient(135deg, #c9a96e, #8b6914)", border: "none", color: "#0f0d0a", fontWeight: "bold", fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                      Request a Tour →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {listings && listings.length === 0 && !listingError && (
          <div style={{ background: "#1a1713", border: "1px solid #2a2520", borderRadius: 16, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
            <div style={{ color: "#9a8d7a", fontSize: 14 }}>No listings found. Try a different city or higher budget.</div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: "1px solid #2a2520", padding: "13px 18px", background: "#110f0c", position: "sticky", bottom: 0 }}>
        <div style={{ maxWidth: 740, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 9, alignItems: "flex-end", background: "#1c1915", border: "1px solid #2a2520", borderRadius: 13, padding: "7px 11px" }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Describe your dream home..."
              rows={1}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e8d5b0", fontSize: 15, fontFamily: "Georgia, serif", resize: "none", lineHeight: 1.5, padding: "4px 0" }}
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()} style={{ width: 33, height: 33, borderRadius: "50%", background: input.trim() && !loading ? "linear-gradient(135deg, #c9a96e, #8b6914)" : "#2a2520", border: "none", cursor: input.trim() && !loading ? "pointer" : "default", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s", flexShrink: 0, color: input.trim() && !loading ? "#0f0d0a" : "#4a4035" }}>↑</button>
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: "#2a2520", marginTop: 5 }}>Haven · Powered by Claude AI + RentCast</div>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes bounce { 0%,100% { transform:translateY(0); opacity:0.4; } 50% { transform:translateY(-4px); opacity:1; } }
        * { box-sizing: border-box; }
        textarea::placeholder { color: #3a3530; }
      `}</style>
    </div>
  );
}
