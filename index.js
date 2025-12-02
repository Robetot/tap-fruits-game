import { useEffect, useRef, useState } from "react";

const FRUITS = [
  { id: "apple", emoji: "🍎", points: 10 },
  { id: "banana", emoji: "🍌", points: 8 },
  { id: "strawberry", emoji: "🍓", points: 12 },
  { id: "orange", emoji: "🍊", points: 9 },
  { id: "grape", emoji: "🍇", points: 11 }
];

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

export default function Home() {
  const [fruits, setFruits] = useState([]); // {id, x, y, size, speed, kind, uid}
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [high, setHigh] = useState(0);
  const gameRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const saved = parseInt(localStorage.getItem("tapfruits_high") || "0", 10);
    setHigh(saved);
  }, []);

  useEffect(() => {
    if (!running) return;
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [running, fruits, timeLeft]);

  // Spawn fruits periodically
  useEffect(() => {
    let spawn;
    if (running) {
      spawn = setInterval(() => {
        setFruits(prev => {
          const uid = Date.now() + Math.random();
          const kind = FRUITS[Math.floor(Math.random() * FRUITS.length)];
          // spawn at random top x
          const size = rand(36, 72); // px
          return [
            ...prev,
            {
              uid,
              kind,
              x: rand(8, 92), // percent
              y: -10, // above top (percent)
              size,
              speed: rand(0.2, 0.8) // percent per frame-ish
            }
          ].slice(-12); // cap
        });
      }, 700); // every 0.7s
    }
    return () => clearInterval(spawn);
  }, [running]);

  // Timer
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setTimeLeft(v => {
        if (v <= 1) {
          setRunning(false);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  function tick() {
    // update positions
    setFruits(prev =>
      prev
        .map(f => ({ ...f, y: f.y + f.speed * 1.4 })) // fall
        .filter(f => f.y < 120) // remove if fallen below view
    );
    frameRef.current = requestAnimationFrame(tick);
  }

  function handleStart() {
    setScore(0);
    setTimeLeft(30);
    setFruits([]);
    setRunning(true);
    // slight warm-up spawn
    setTimeout(() => {
      setFruits(prev => prev.concat([]));
    }, 200);
  }

  function catchFruit(uid) {
    setFruits(prev => {
      const f = prev.find(p => p.uid === uid);
      if (!f) return prev;
      setScore(s => {
        const ns = s + (f.kind.points || 10);
        if (ns > high) {
          setHigh(ns);
          localStorage.setItem("tapfruits_high", String(ns));
        }
        return ns;
      });
      // pop animation: replace with removed marker
      return prev.filter(p => p.uid !== uid);
    });
  }

  function onTap(e) {
    // get tap coordinates inside game area
    const rect = gameRef.current.getBoundingClientRect();
    const x = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) / rect.width * 100;
    const y = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) / rect.height * 100;

    // find nearest fruit within hitbox
    let found = null;
    for (let f of fruits) {
      const dx = Math.abs(f.x - x);
      const dy = Math.abs(f.y - y);
      const hitX = (f.size / rect.width) * 100 + 6; // rough hit radius scaling
      const hitY = (f.size / rect.height) * 100 + 6;
      if (dx < hitX && dy < hitY) {
        found = f;
        break;
      }
    }
    if (found) catchFruit(found.uid);
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={{textAlign:"left"}}>
          <div style={{fontSize:18, fontWeight:700}}>Tap to Catch Fruits</div>
          <div style={{fontSize:12, color:"#666"}}>Tap fruits to score — {timeLeft}s</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:18, fontWeight:700}}>{score}</div>
          <div style={{fontSize:12, color:"#666"}}>High {high}</div>
        </div>
      </header>

      <main
        ref={gameRef}
        onMouseDown={onTap}
        onTouchStart={onTap}
        style={styles.gameArea}
      >
        {/* fruits */}
        {fruits.map(f => (
          <Fruit key={f.uid} fruit={f} onCatch={() => catchFruit(f.uid)} />
        ))}

        {!running && (
          <div style={styles.centerCard}>
            <div style={{fontSize:20, fontWeight:700, marginBottom:8}}>Ready?</div>
            <div style={{fontSize:14, color:"#444", marginBottom:12}}>Catch as many fruits as you can in 30s</div>
            <button style={styles.button} onClick={handleStart}>Start</button>
            <div style={{fontSize:12, color:"#777", marginTop:10}}>Tap anywhere to catch fruits</div>
          </div>
        )}

        {!running && timeLeft === 0 && (
          <div style={styles.endCard}>
            <div style={{fontSize:20, fontWeight:800}}>Time's up!</div>
            <div style={{fontSize:16, marginTop:8}}>Score: {score}</div>
            <div style={{fontSize:14, color:"#666"}}>High: {high}</div>
            <button style={styles.button} onClick={handleStart}>Play again</button>
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <div style={{fontSize:12,color:"#666"}}>Made for Farcaster Frame — mobile friendly</div>
        <div style={{fontSize:12,color:"#666"}}>Tap fruits quickly — different fruits give different points</div>
      </footer>
    </div>
  );
}

function Fruit({ fruit, onCatch }) {
  const style = {
    position: "absolute",
    left: `${fruit.x}%`,
    top: `${fruit.y}%`,
    transform: "translate(-50%,-50%)",
    width: fruit.size,
    height: fruit.size,
    fontSize: Math.max(24, fruit.size * 0.6),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    userSelect: "none",
    touchAction: "manipulation"
  };

  return (
    <div style={style} onMouseDown={onCatch} onTouchStart={onCatch} role="button" aria-label="fruit">
      <div style={{
        width: "100%",
        height: "100%",
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 6px 12px rgba(0,0,0,0.12)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))"
      }}>
        <span style={{filter: "drop-shadow(0 2px 0 rgba(0,0,0,0.08))"}}>{fruit.kind.emoji}</span>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
    background: "linear-gradient(180deg,#fff8f4,#fff)"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    padding: "14px 16px",
    alignItems: "center",
    borderBottom: "1px solid rgba(0,0,0,0.06)"
  },
  gameArea: {
    flex: 1,
    position: "relative",
    height: "60vh",
    margin: 16,
    borderRadius: 14,
    overflow: "hidden",
    background: "linear-gradient(180deg,#e8fdf0,#fff)",
    boxShadow: "0 10px 30px rgba(12, 30, 40, 0.06)"
  },
  centerCard: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%,-50%)",
    background: "white",
    padding: 18,
    borderRadius: 12,
    textAlign: "center",
    width: "80%",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)"
  },
  endCard: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%,-50%)",
    background: "white",
    padding: 18,
    borderRadius: 12,
    textAlign: "center",
    width: "80%",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)"
  },
  button: {
    background: "#ff6b35",
    color: "white",
    border: "none",
    padding: "10px 18px",
    borderRadius: 10,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 6
  },
  footer: {
    padding: 12,
    textAlign: "center"
  }
};
