import React, { useState, useEffect } from 'react';

// Team accent colors — drive the card's left border and badge, and double
// as the option list for the "Sign Driver" dropdown.
const teamColors = {
  Ferrari: '#e10600',
  'Red Bull': '#1e3a8a',
  McLaren: '#ff8000',
  Mercedes: '#00d2be',
  'Aston Martin': '#00665e',
  Alpine: '#ff87bc',
  Williams: '#00a0de',
  Haas: '#b6babd',
  Sauber: '#52e252',
  'Racing Bulls': '#6692ff',
};

const teamOptions = Object.keys(teamColors);
const FALLBACK_COLOR = '#94a3b8';

// Converts a team's hex color into an rgba() string so the badge fill
// and hover glow can use transparency (per-team, computed on the fly).
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Shared team-badge style, reused by DriverCard and the car status panel.
function teamBadgeStyle(category) {
  const accentColor = teamColors[category] || FALLBACK_COLOR;
  return {
    backgroundColor: hexToRgba(accentColor, 0.2),
    color: accentColor,
    border: `1px solid ${hexToRgba(accentColor, 0.45)}`,
    padding: '6px 14px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  };
}

// ---------- Car wear helpers ----------
// pct is "percent worn": 0 = brand new, 100 = destroyed.
const WEAR_GREEN = '#2ecc71';
const WEAR_ORANGE = '#f5a623';
const WEAR_RED = '#e10600';

function wearColor(pct) {
  if (pct >= 67) return WEAR_RED;
  if (pct >= 34) return WEAR_ORANGE;
  return WEAR_GREEN;
}

function wearTextColor(pct) {
  return pct >= 67 ? '#ffffff' : '#1a1a1a';
}

function wearStatusLabel(pct) {
  if (pct >= 67) return 'Critical';
  if (pct >= 34) return 'Wearing';
  return 'Fine';
}

function randomWear() {
  return Math.floor(Math.random() * 20) + 5; // 5–24%: a "freshly built" car
}

function makeFreshCarStatus() {
  return {
    frontWing: randomWear(),
    rearWing: randomWear(),
    engine: randomWear(),
    frontBrakes: randomWear(),
    rearBrakes: randomWear(),
    tireFL: randomWear(),
    tireFR: randomWear(),
    tireRL: randomWear(),
    tireRR: randomWear(),
  };
}

// Where each part sits in the 220×330 blueprint, and what it's labeled.
const CAR_PARTS_LAYOUT = [
  { key: 'frontWing', name: 'Front Wing', label: 'FRONT WING', x: 50, y: 10, w: 120, h: 16, rx: 5, fontSize: 9 },
  { key: 'tireFL', name: 'Front-Left Tire', label: 'FL', x: 20, y: 55, w: 30, h: 60, rx: 12, fontSize: 9 },
  { key: 'tireFR', name: 'Front-Right Tire', label: 'FR', x: 170, y: 55, w: 30, h: 60, rx: 12, fontSize: 9 },
  { key: 'frontBrakes', name: 'Front Brakes', label: 'BRK', x: 95, y: 68, w: 30, h: 24, rx: 5, fontSize: 7.5 },
  { key: 'engine', name: 'Engine', label: 'ENGINE', x: 85, y: 140, w: 50, h: 70, rx: 8, fontSize: 9 },
  { key: 'rearBrakes', name: 'Rear Brakes', label: 'BRK', x: 95, y: 236, w: 30, h: 24, rx: 5, fontSize: 7.5 },
  { key: 'tireRL', name: 'Rear-Left Tire', label: 'RL', x: 20, y: 225, w: 30, h: 60, rx: 12, fontSize: 9 },
  { key: 'tireRR', name: 'Rear-Right Tire', label: 'RR', x: 170, y: 225, w: 30, h: 60, rx: 12, fontSize: 9 },
  { key: 'rearWing', name: 'Rear Wing', label: 'REAR WING', x: 50, y: 304, w: 120, h: 16, rx: 5, fontSize: 9 },
];

// ---------- Real race data ----------
// id must match the starter driver with that real name below.
// Sourced from race reports of the actual 2025 Australian Grand Prix
// (Melbourne, Albert Park) — a genuinely chaotic, three-safety-car season
// opener that happened to feature all four starter drivers. Replayed here
// as a scripted sequence instead of random events, so every log line below
// corresponds to something that really happened on that Sunday.
const RACE_SCRIPT = [
  { lap: 1, text: '🚨 Safety Car — Hadjar and Sainz both crash out at Albert Park' },
  { lap: 7, text: '🏁 Safety Car in — Norris leads the restart from Verstappen' },
  { lap: 18, driverId: 2, type: 'incident', pointsDelta: -4, wingBump: 25, text: '⚠️ Verstappen — a rare mistake costs him time' },
  { lap: 34, driverId: 4, type: 'incident', pointsDelta: -10, wingBump: 55, text: '💥 Alonso crashes into the wall at Turn 7 — DNF, Safety Car deployed' },
  { lap: 34, driverId: 3, type: 'pit', pointsDelta: -1, text: '🔧 Norris pits for hard tires under the Safety Car' },
  { lap: 34, driverId: 2, type: 'pit', pointsDelta: -1, text: '🔧 Verstappen pits for medium tires' },
  { lap: 40, driverId: 1, type: 'gain', pointsDelta: 5, text: '🏎️ Hamilton stays out and grabs the race lead' },
  { lap: 47, text: '🚨 Safety Car — Lawson crashes out of the race' },
  { lap: 52, text: '🏁 Safety Car in — Verstappen chases Norris to the flag' },
  { lap: 57, driverId: 3, type: 'finish', pointsDelta: 25, text: '🏆 Chequered flag — Norris wins! Verstappen 2nd, Hamilton P10, Alonso DNF' },
];

// Bonus feature: a mini color-coded car blueprint for whichever driver is
// selected, inspired by the car-status screens in F1 racing games.
function CarBlueprint({ driver }) {
  const { carStatus } = driver;

  return (
    <div style={styles.carPanel}>
      <div style={styles.carPanelHeader}>
        <div>
          <p style={styles.carPanelLabel}>Car Status</p>
          <p style={styles.carPanelName}>{driver.title}</p>
        </div>
        <span style={teamBadgeStyle(driver.category)}>{driver.category}</span>
      </div>

      <svg viewBox="0 0 220 330" style={styles.carSvg}>
        <rect x="90" y="26" width="40" height="284" rx="18" fill="#3a3b42" stroke="#52545c" strokeWidth="1" />
        {CAR_PARTS_LAYOUT.map((part) => {
          const pct = carStatus[part.key];
          return (
            <g key={part.key}>
              <rect x={part.x} y={part.y} width={part.w} height={part.h} rx={part.rx} fill={wearColor(pct)}>
                <title>{`${part.name}: ${pct}% worn (${wearStatusLabel(pct)})`}</title>
              </rect>
              <text
                x={part.x + part.w / 2}
                y={part.y + part.h / 2 + 3}
                fontSize={part.fontSize}
                fill={wearTextColor(pct)}
                textAnchor="middle"
                fontFamily="Arial, sans-serif"
                style={{ pointerEvents: 'none' }}
              >
                {part.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div style={styles.legend}>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendDot, backgroundColor: WEAR_GREEN }} /> Fine
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendDot, backgroundColor: WEAR_ORANGE }} /> Wearing
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendDot, backgroundColor: WEAR_RED }} /> Critical
        </span>
      </div>
    </div>
  );
}

// Bonus feature: a simplified oval circuit with a dot per driver, placed by
// current race position, plus a live event feed (pit stops / incidents).
function RaceTrack({ standings, flashId }) {
  const total = standings.length || 1;

  return (
    <svg viewBox="0 0 300 180" style={styles.trackSvg}>
      <ellipse cx="150" cy="90" rx="120" ry="60" fill="none" stroke="#3a3b42" strokeWidth="18" />
      <ellipse cx="150" cy="90" rx="120" ry="60" fill="none" stroke="#52545c" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="150" y1="20" x2="150" y2="40" stroke="#ffffff" strokeWidth="3" />

      {standings.map((driver, i) => {
        const theta = (i / total) * Math.PI * 2;
        const x = 150 + 120 * Math.sin(theta);
        const y = 90 - 60 * Math.cos(theta);
        const isFlashing = flashId === driver.id;
        const dotColor = teamColors[driver.category] || FALLBACK_COLOR;

        return (
          <circle
            key={driver.id}
            cx={x}
            cy={y}
            r={isFlashing ? 9 : 6}
            fill={isFlashing ? WEAR_RED : dotColor}
            stroke={isFlashing ? '#ffffff' : '#1f2025'}
            strokeWidth={isFlashing ? 2 : 1.5}
          >
            <title>{`P${i + 1} ${driver.title}`}</title>
          </circle>
        );
      })}
    </svg>
  );
}

// Requirement 2: a separate, reusable component that receives driver data via props
function DriverCard({ driver, position, isSelected, onSelect }) {
  const [isHovered, setIsHovered] = useState(false);
  const accentColor = teamColors[driver.category] || FALLBACK_COLOR;

  const cardStyles = {
    card: {
      backgroundColor: '#2b2c32',
      borderLeft: `6px solid ${accentColor}`,
      borderRadius: '10px',
      padding: '16px 20px',
      marginBottom: '12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer',
      outline: isSelected ? `2px solid ${accentColor}` : '2px solid transparent',
      outlineOffset: '2px',
      boxShadow: isHovered || isSelected
        ? `0 4px 14px ${hexToRgba(accentColor, 0.25)}`
        : '0 2px 8px rgba(0, 0, 0, 0.3)',
      transition: 'box-shadow 0.2s ease, outline-color 0.2s ease',
    },
    left: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    positionBadge: {
      width: '30px',
      height: '30px',
      borderRadius: '50%',
      border: '1px solid #4a4b52',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: 700,
      color: '#ffffff',
      flexShrink: 0,
    },
    name: {
      color: '#ffffff',
      fontSize: '17px',
      fontWeight: 600,
      margin: 0,
    },
    points: {
      color: '#94a3b8',
      fontSize: '12px',
      margin: '2px 0 0 0',
    },
  };

  return (
    <div
      style={cardStyles.card}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(driver.id)}
    >
      <div style={cardStyles.left}>
        <span style={cardStyles.positionBadge}>P{position}</span>
        <div>
          <p style={cardStyles.name}>{driver.title}</p>
          <p style={cardStyles.points}>{driver.points} pts</p>
        </div>
      </div>
      <span style={teamBadgeStyle(driver.category)}>{driver.category}</span>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#1f2025',
    fontFamily: '"Segoe UI", Roboto, Inter, sans-serif',
    display: 'flex',
    justifyContent: 'center',
    padding: '48px 20px',
    boxSizing: 'border-box',
  },
  board: {
    width: '100%',
    maxWidth: '560px',
    height: 'fit-content',
    backgroundColor: '#1f2025',
    borderRadius: '12px',
    boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.06), 0 0 40px rgba(225, 6, 0, 0.12)',
    padding: '32px',
    boxSizing: 'border-box',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  title: {
    color: '#ffffff',
    fontSize: '26px',
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '13px',
    marginTop: '6px',
  },
  form: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '26px',
  },
  input: {
    flex: '1 1 160px',
    backgroundColor: '#2b2c32',
    border: '1px solid #3a3b42',
    borderRadius: '8px',
    padding: '12px 14px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  },
  select: {
    flex: '1 1 140px',
    backgroundColor: '#2b2c32',
    border: '1px solid #3a3b42',
    borderRadius: '8px',
    padding: '12px 14px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
  },
  button: {
    border: 'none',
    borderRadius: '8px',
    padding: '12px 22px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  empty: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: '14px',
    padding: '16px 0',
  },
  carPanel: {
    backgroundColor: '#2b2c32',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '8px',
    border: '1px solid #3a3b42',
  },
  carPanelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  carPanelLabel: {
    color: '#94a3b8',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: 0,
  },
  carPanelName: {
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: 700,
    margin: '4px 0 0 0',
  },
  carSvg: {
    width: '100%',
    maxWidth: '220px',
    display: 'block',
    margin: '0 auto',
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginTop: '12px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#94a3b8',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  racePanel: {
    backgroundColor: '#2b2c32',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '16px',
    border: '1px solid #3a3b42',
  },
  racePanelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    gap: '12px',
  },
  raceSourceNote: {
    color: '#6b6d76',
    fontSize: '10px',
    margin: '2px 0 0 0',
  },
  trackSvg: {
    width: '100%',
    display: 'block',
    marginBottom: '14px',
  },
  raceLog: {
    maxHeight: '170px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  raceLogEntry: {
    color: '#cbd5e1',
    fontSize: '12px',
    margin: 0,
    padding: '7px 10px',
    backgroundColor: '#1f2025',
    borderRadius: '6px',
    borderLeft: '3px solid #52545c',
  },
  raceLogEmpty: {
    color: '#94a3b8',
    fontSize: '13px',
    textAlign: 'center',
    padding: '12px 0',
    margin: 0,
  },
};

const INITIAL_DRIVERS = [
  {
    id: 1, title: 'Lewis Hamilton', category: 'Ferrari', points: 241,
    carStatus: { frontWing: 18, rearWing: 24, engine: 12, frontBrakes: 30, rearBrakes: 22, tireFL: 45, tireFR: 40, tireRL: 55, tireRR: 50 },
  },
  {
    id: 2, title: 'Max Verstappen', category: 'Red Bull', points: 285,
    carStatus: { frontWing: 10, rearWing: 15, engine: 8, frontBrakes: 20, rearBrakes: 18, tireFL: 35, tireFR: 32, tireRL: 40, tireRR: 38 },
  },
  {
    id: 3, title: 'Lando Norris', category: 'McLaren', points: 258,
    carStatus: { frontWing: 14, rearWing: 20, engine: 10, frontBrakes: 25, rearBrakes: 20, tireFL: 60, tireFR: 58, tireRL: 70, tireRR: 65 },
  },
  {
    id: 4, title: 'Fernando Alonso', category: 'Aston Martin', points: 70,
    carStatus: { frontWing: 45, rearWing: 50, engine: 35, frontBrakes: 60, rearBrakes: 55, tireFL: 75, tireFR: 72, tireRL: 80, tireRR: 78 },
  },
];

function cloneInitialDrivers() {
  return INITIAL_DRIVERS.map((d) => ({ ...d, carStatus: { ...d.carStatus } }));
}

// Requirements 1, 3 & 4: state, the sign-driver form, and the change-logging effect
function App() {
  const [drivers, setDrivers] = useState(cloneInitialDrivers);
  const [selectedDriverId, setSelectedDriverId] = useState(1);
  const [nameInput, setNameInput] = useState('');
  const [teamInput, setTeamInput] = useState(teamOptions[0]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  // Bonus feature: replays the real 2025 Australian GP, one scripted event at a time
  const [isRacing, setIsRacing] = useState(false);
  const [lap, setLap] = useState(0);
  const [raceLog, setRaceLog] = useState([]);
  const [flashId, setFlashId] = useState(null);
  const [scriptIndex, setScriptIndex] = useState(0);

  // Requirement 4: runs on mount, then again every time the drivers array changes
  useEffect(() => {
    console.log('Paddock grid updated!', drivers.length);
  }, [drivers]);

  // Plays RACE_SCRIPT one entry at a time, 3 seconds apart, while isRacing is true.
  // Re-firing on scriptIndex (rather than a free-running setInterval) means each
  // step always sees fresh state — no stale closures to work around.
  useEffect(() => {
    if (!isRacing) return undefined;
    if (scriptIndex >= RACE_SCRIPT.length) {
      setIsRacing(false);
      return undefined;
    }

    const timer = setTimeout(() => {
      const event = RACE_SCRIPT[scriptIndex];

      if (event.driverId) {
        setDrivers((prev) => prev.map((d) => {
          if (d.id !== event.driverId) return d;
          let carStatus = d.carStatus;
          if (event.type === 'pit') {
            carStatus = { ...carStatus, tireFL: randomWear(), tireFR: randomWear(), tireRL: randomWear(), tireRR: randomWear() };
          }
          if (event.wingBump) {
            const bump = (v) => Math.min(100, v + event.wingBump);
            carStatus = { ...carStatus, frontWing: bump(carStatus.frontWing), rearWing: bump(carStatus.rearWing) };
          }
          return { ...d, points: Math.max(0, d.points + (event.pointsDelta || 0)), carStatus };
        }));

        if (event.type === 'incident') {
          setFlashId(event.driverId);
          setTimeout(() => setFlashId(null), 1600);
        }
      }

      setRaceLog((prevLog) => [{ id: Date.now(), text: `Lap ${event.lap}: ${event.text}` }, ...prevLog].slice(0, 10));
      setLap(event.lap);
      setScriptIndex((i) => i + 1);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isRacing, scriptIndex]);

  // Requirement 3: adds the new driver to state — grid re-renders instantly, no reload
  const handleSignDriver = () => {
    const trimmedName = nameInput.trim();
    if (!trimmedName) return;

    const newDriver = {
      id: Date.now(),
      title: trimmedName,
      category: teamInput,
      points: 0,
      carStatus: makeFreshCarStatus(),
    };

    setDrivers((prevDrivers) => [...prevDrivers, newDriver]);
    setSelectedDriverId(newDriver.id);
    setNameInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSignDriver();
  };

  const handleRaceButtonClick = () => {
    if (isRacing) {
      setIsRacing(false);
      return;
    }
    if (scriptIndex >= RACE_SCRIPT.length) {
      setDrivers(cloneInitialDrivers());
      setScriptIndex(0);
      setLap(0);
      setRaceLog([]);
    }
    setIsRacing(true);
  };

  const raceButtonLabel = isRacing
    ? 'Pause Race'
    : scriptIndex >= RACE_SCRIPT.length
      ? 'Replay Race'
      : scriptIndex > 0
        ? 'Resume Race'
        : 'Start Race';

  const raceStatusText = isRacing
    ? `Lap ${lap}`
    : scriptIndex >= RACE_SCRIPT.length
      ? `Finished — Lap ${lap}`
      : scriptIndex > 0
        ? `Paused — Lap ${lap}`
        : 'Not started';

  // Bonus feature: standings sorted by points, with position (P1, P2…) read off the sort order
  const standings = [...drivers].sort((a, b) => b.points - a.points);
  const selectedDriver = drivers.find((d) => d.id === selectedDriverId) || standings[0];

  return (
    <div style={styles.page}>
      <div style={styles.board}>
        <div style={styles.header}>
          <h1 style={styles.title}>F1 Paddock Grid Manager</h1>
          <p style={styles.subtitle}>{drivers.length} drivers signed</p>
        </div>

        <div style={styles.form}>
          <input
            type="text"
            placeholder="Driver name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            style={{
              ...styles.input,
              borderColor: isInputFocused ? '#e10600' : '#3a3b42',
              boxShadow: isInputFocused ? '0 0 0 3px rgba(225, 6, 0, 0.2)' : 'none',
            }}
          />

          <select
            value={teamInput}
            onChange={(e) => setTeamInput(e.target.value)}
            style={styles.select}
          >
            {teamOptions.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>

          <button
            onClick={handleSignDriver}
            onMouseEnter={() => setIsButtonHovered(true)}
            onMouseLeave={() => setIsButtonHovered(false)}
            style={{
              ...styles.button,
              backgroundColor: isButtonHovered ? '#a60400' : '#e10600',
            }}
          >
            Sign Driver
          </button>
        </div>

        <div>
          {standings.length === 0 ? (
            <p style={styles.empty}>No drivers signed yet.</p>
          ) : (
            // Requirement 1: rendered via .map() with a unique key
            standings.map((driver, index) => (
              <DriverCard
                key={driver.id}
                driver={driver}
                position={index + 1}
                isSelected={driver.id === selectedDriverId}
                onSelect={setSelectedDriverId}
              />
            ))
          )}
        </div>

        {selectedDriver && <CarBlueprint driver={selectedDriver} />}

        <div style={styles.racePanel}>
          <div style={styles.racePanelHeader}>
            <div>
              <p style={styles.carPanelLabel}>Race Control</p>
              <p style={styles.carPanelName}>{raceStatusText}</p>
              <p style={styles.raceSourceNote}>Replaying the real 2025 Australian GP</p>
            </div>
            <button
              onClick={handleRaceButtonClick}
              style={{
                ...styles.button,
                backgroundColor: isRacing ? '#3a3b42' : '#e10600',
              }}
            >
              {raceButtonLabel}
            </button>
          </div>

          <RaceTrack standings={standings} flashId={flashId} />

          <div style={styles.raceLog}>
            {raceLog.length === 0 ? (
              <p style={styles.raceLogEmpty}>Press "Start Race" to replay it, lap by lap.</p>
            ) : (
              raceLog.map((entry) => (
                <p key={entry.id} style={styles.raceLogEntry}>{entry.text}</p>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
