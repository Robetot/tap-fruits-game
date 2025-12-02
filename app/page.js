"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Advanced Tap-to-Catch Fruits (Farcaster-ready)
 * - dynamic imports the Farcaster frame SDK (client-only)
 * - attempts to call sdk.shareScore(score) if available for Farcaster integration
 * - also uses navigator.share as a fallback (mobile share)
 */

const FRUITS = [
  { id: "apple", emoji: "🍎", points: 10 },
  { id: "banana", emoji: "🍌", points: 8 },
  { id: "strawberry", emoji: "🍓", points: 12 },
  { id: "orange", emoji: "🍊", points: 9 },
  { id: "grape", emoji: "🍇", points: 11 },
];

function rand(min, max) { return Math.random() * (max - min) + min; }

export default function Page() {
  const [fruits, setFruits] = useState([]);
  const [score, setScore] = useState(0);
  const [high, setHigh] = useState(0);
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const frameRef = useRef(null);
  const gameRef = useRef(null);
  const sdkRef = useRef(null);

  // Load high score
  useEffect(() => {
    const saved = parseInt(localStorage.getItem("tapfruits_high") || "0", 10);
    setHigh(saved);
  }, []);

  // Try to dynamic import Farcaster frame SDK (client-side only)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sdk = await import("@farcaster/frame-sdk");
        if (mounted && sdk) {
          sdkRef.current = sdk;
          console.log("Farcaster SDK loaded:", sdk);
        }
      } catch (err) {
        console.log("Farcaster SDK not available (ok):", err?.message || err);
      }
    })();
    return () => (mounted = false);
  }, []);

  // Spawn fruits
  useEffect(() => {
    if (!running) return;
    const spawn = setInterval(() => {
      setFruits(prev => {
        const uid = Date.now() + Math.random();
        const kind = FRUITS[Math.floor(Math.random() * FRUITS.length)];
        const size = rand(36, 74);
        return [...prev, {
          uid,
          kind,
          x: rand(8, 92),
          y: -10,
          size,
          speed: rand(0.2, 0.9)
        }].slice(-18);
      });
    }, 600);
    return () => clearInterval(spawn);
  }, [running]);

  // Timer and game loop
  useEffect(() => {
    if (!running) return;
    frameRef.current = requestAnimationFrame(tick);
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setRunning(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      cancelAnimationFrame(frameRef.current);
      clearInterval(timer);
    };
  }, [running]);

  function tick() {
    setFruits(prev => prev.map(f => ({ ...f, y: f.y + f.speed * (1 + score/100) })).filter(f => f.y < 130));
    frameRef.current = requestAnimationFrame(tick);
  }

  function startGame() {
    setScore(0);
    setFruits([]);
    setTimeLeft(30);
    setRunning(true);
  }

  function catchFruit(uid) {
    setFruits(prev => {
      const picked = prev.find(p => p.uid === uid);
      if (!picked) return prev;
      setScore(s => {
        const ns = s + (picked.kind.points || 10);
        if (ns > high) {
          setHigh(ns);
          localStorage.setItem("tapfruits_high", String(ns));
        }
        return ns;
      });
      return prev.filter(p => p.uid !== uid);
    });
  }

  function onTap(e) {
    const rect = gameRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    // Find first fruit in hit area
    for (let f of fruits) {
      const dx = Math.abs(f.x - x);
      const dy = Math.abs(f.y - y);
      const hitX = (f.size / rect.width) * 100 + 6;
      const hitY = (f.size / rect.height) * 100 + 6;
      if (dx < hitX && dy < hitY) {
        catchFruit(f.uid);
        return;
      }
    }
  }

  // Share score: try Farcaster SDK, fallback to Web Share
  async function shareScore() {
    const text = `I scored ${score} in Tap Fruits! ${process.env.NEXT_PUBLIC_URL || ""}`;
    try {
      const sdk = sdkRef.current;
      if (sdk && typeof sdk.shareScore === "function") {
        await sdk.shareScore({ score, url: process.env.NEXT_PUBLIC_URL || "" });
        return;
      }
    } catch (err) {
      console.warn("Farcaster share failed:", err);
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: "Tap Fruits", text, url: process.env.NEXT_PUBLIC_URL || undefined });
        return;
      } catch (err) {
        console.warn("navigator.share canceled/failed:", err);
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      alert("Score copied to clipboard. Paste in Farcaster or anywhere to share.");
    } catch {
      alert("Could not share automatically. Score: " + score);
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Tap Fruits</div>
          <div style={{ fontSize: 12, color: "#666" }}>Tap fruits to score — {timeLeft}s</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{score}</div>
          <div style={{ fontSize: 12, color: "#666" }}>High {high}</div>
        </div>
      </header>

      <main
        ref={gameRef}
        onMouseDown={onTap}
        onTouchStart={onTap}
        style={styles.gameArea}
      >
        {fruits.map(f => <Fruit key={f.uid} f={f} onCatch={() => catchFruit(f.uid)} />)}

        {!running && timeLeft > 0 && (
          <div style={styles.centerCard}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Ready?</div>
            <div style={{ marginTop: 8, color: "#444" }}>Catch as many fruits as you can in 30s</div>
            <button style={styles.button} onClick={startGame}>Start</button>
            <div style={{ marginTop: 8, fontSize: 12, color: "#777" }}>Tap fruits to catch them</div>
          </div>
        )}

        {!running && timeLeft === 0 && (
          <div style={styles.endCard}>
            <div style={{ fontSize: 20, fontWeight: 900 }}>Time's up!</div>
            <div style={{ marginTop: 8, fontSize: 16 }}>Score: {score}</div>
            <div style={{ color: "#666" }}>High: {high}</div>
            <div style={{ marginTop: 12 }}>
              <button style={styles.button} onClick={startGame}>Play again</button>
              <button style={styles.ghostButton} onClick={shareScore}>Share score</button>
            </div>
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <div style={{ fontSize: 12, color: "#666" }}>Farcaster-ready: set NEXT_PUBLIC_URL in Vercel settings for registration</div>
      </footer>
    </div>
  );
}

function Fruit({ f, onCatch }) {
  const style = {
    position: "absolute",
    left: `${f.x}%`,
    top: `${f.y}%`,
    transform: "translate(-50%,-50%)",
    width: f.size,
    height: f.size,
    fontSize: Math.max(24, f.size * 0.6),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    userSelect: "none",
    touchAction: "manipulation",
    transition: "transform 80ms linear"
  };

  return (
    <div style={style} onMouseDown={onCatch} onTouchStart={onCatch} role="button" aria-label="fruit">
      <div style={{
        width: "100%",
        height: "100%",
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 10px 20px rgba(0,0,0,0.12)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))"
      }}>
        <span style={{ filter: "drop-shadow(0 3px 0 rgba(0,0,0,0.06))" }}>{f.kind.emoji}</span>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#fff8f4,#fff)" },
  header: { display: "flex", justifyContent: "space-between", padding: "14px 16px", alignItems: "center" },
  gameArea: { flex: 1, position: "relative", height: "64vh", margin: 16, borderRadius: 14, overflow: "hidden", background: "linear-gradient(180deg,#e8fdf0,#fff)", boxShadow: "0 10px 30px rgba(12,30,40,0.06)" },
  centerCard: { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", background: "white", padding: 18, borderRadius: 12, textAlign: "center", width: "80%", boxShadow: "0 6px 18px rgba(0,0,0,0.08)" },
  endCard: { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", background: "white", padding: 18, borderRadius: 12, textAlign: "center", width: "80%", boxShadow: "0 6px 18px rgba(0,0,0,0.08)" },
  button: { background: "#ff6b35", color: "white", border: "none", padding: "10px 18px", borderRadius: 10, fontWeight: 800, cursor: "pointer", marginTop: 8 },
  ghostButton: { marginLeft: 10, border: "1px solid #ddd", background: "white", padding: "10px 12px", borderRadius: 10, cursor: "pointer" },
  footer: { padding: 12, textAlign: "center" }
};
