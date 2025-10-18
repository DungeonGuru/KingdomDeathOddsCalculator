import React, { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";


function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function d10ProbAtLeast(threshold) {
  const t = clamp(Math.floor(threshold), 2, 10);
  return (11 - t) / 10;
}

function inclusiveBlockSize(lo, hi) {
  const L = clamp(Math.floor(lo), 2, 10);
  const H = clamp(Math.floor(hi), 2, 10);
  if (L > H) return 0;
  return H - L + 1;
}

function choose(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let res = 1;
  for (let i = 1; i <= k; i++) res = (res * (n - k + i)) / i;
  return res;
}

function binomPMF(n, k, p) {
  return choose(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

function calc({ s, a, wStr, cStr, T, L, critRule }) {
  const pHit = d10ProbAtLeast(a);
  const totalStr = wStr + cStr;
  const woundThreshold = clamp(T - totalStr, 2, 10);
  const pWoundRoll = d10ProbAtLeast(woundThreshold);
  const pCritOnWoundRollLiberal = Math.min(L + 1, 9) / 10;

  const strictLow = Math.max(woundThreshold, 10 - L);
  const pCritOnWoundRollStrict = inclusiveBlockSize(strictLow, 10) / 10;

  const pCritOnWoundRoll = critRule === "strict" ? pCritOnWoundRollStrict : pCritOnWoundRollLiberal;

  const pCritPerDie = pHit * pCritOnWoundRoll;

  let pAnyWoundPerDie;
  if (critRule === "strict") {
    pAnyWoundPerDie = pHit * pWoundRoll;
  } else {
    const unionWoundRoll = Math.max(pWoundRoll, pCritOnWoundRollLiberal);
    pAnyWoundPerDie = pHit * unionWoundRoll;
  }

  const expectedCrits = s * pCritPerDie;
  const expectedWounds = s * pAnyWoundPerDie;
  const pAtLeast1Crit = 1 - Math.pow(1 - pCritPerDie, s);
  const pAtLeast1Wound = 1 - Math.pow(1 - pAnyWoundPerDie, s);

  const woundsDist = Array.from({ length: s + 1 }, (_, k) => ({ k, p: binomPMF(s, k, pAnyWoundPerDie) }));
  const critsDist = Array.from({ length: s + 1 }, (_, k) => ({ k, p: binomPMF(s, k, pCritPerDie) }));

  return {
    pHit,
    woundThreshold,
    pWoundRoll,
    pCritOnWoundRoll,
    pCritPerDie,
    pAnyWoundPerDie,
    expectedCrits,
    expectedWounds,
    pAtLeast1Crit,
    pAtLeast1Wound,
    woundsDist,
    critsDist,
  };
}

export default function KDMAttackOddsCalculator() {
  const [s, setS] = useState(2);
  const [a, setA] = useState(7); // hits on a+
  const [wStr, setWStr] = useState(1);
  const [cStr, setCStr] = useState(0);
  const [T, setT] = useState(6);
  const [L, setL] = useState(0);
  const [critRule, setCritRule] = useState("liberal");

  const out = useMemo(() =>
    calc({ s: Number(s), a: Number(a), wStr: Number(wStr), cStr: Number(cStr), T: Number(T), L: Number(L), critRule }),
  [s, a, wStr, cStr, T, L, critRule]);

  const kTick = { fontSize: 12 };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Dungeon Guru's Kingdom Death Monster Odds Calculator</h1>
      <p className="text-sm opacity-80">Enter your stats. Results update instantly. “Liberal crit” means any value in the Luck range is a crit and “Strict” requires meeting the wound threshold too (for HL with no crit).</p>

      {/* Inputs */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border bg-black/5 space-y-2">
          <label className="block text-sm font-medium">Speed (s)</label>
          <input type="number" className="w-full p-2 rounded border" value={s} min={1} max={10} onChange={e=>setS(e.target.value)} />

          <label className="block text-sm font-medium mt-3">Accuracy threshold (a) — hits on a+</label>
          <input type="number" className="w-full p-2 rounded border" value={a} min={2} max={10} onChange={e=>setA(e.target.value)} />

          <label className="block text-sm font-medium mt-3">Weapon STR</label>
          <input type="number" className="w-full p-2 rounded border" value={wStr} onChange={e=>setWStr(e.target.value)} />

          <label className="block text-sm font-medium mt-3">Character STR</label>
          <input type="number" className="w-full p-2 rounded border" value={cStr} onChange={e=>setCStr(e.target.value)} />

          <label className="block text-sm font-medium mt-3">Monster Toughness (T)</label>
          <input type="number" className="w-full p-2 rounded border" value={T} min={1} max={20} onChange={e=>setT(e.target.value)} />

          <label className="block text-sm font-medium mt-3">Luck (L)</label>
          <input type="number" className="w-full p-2 rounded border" value={L} min={0} max={9} onChange={e=>setL(e.target.value)} />

          <label className="block text-sm font-medium mt-3">Crit rule</label>
          <select className="w-full p-2 rounded border" value={critRule} onChange={e=>setCritRule(e.target.value)}>
            <option value="liberal">Liberal (any value in L range crits)</option>
            <option value="strict">Strict (must also meet wound threshold)</option>
          </select>
        </div>

        {/* Per-die metrics */}
        <div className="p-4 rounded-2xl border bg-black/5">
          <h2 className="text-lg font-semibold mb-2">Per-die probabilities</h2>
          <ul className="space-y-1 text-sm">
            <li><span className="font-medium">p(hit):</span> {(out.pHit*100).toFixed(1)}%</li>
            <li><span className="font-medium">Wound threshold (w):</span> {out.woundThreshold}</li>
            <li><span className="font-medium">p(wound roll succeeds):</span> {(out.pWoundRoll*100).toFixed(1)}%</li>
            <li><span className="font-medium">p(crit on wound roll):</span> {(out.pCritOnWoundRoll*100).toFixed(1)}%</li>
            <li><span className="font-medium">p(crit per die):</span> {(out.pCritPerDie*100).toFixed(2)}%</li>
            <li><span className="font-medium">p(any wound per die):</span> {(out.pAnyWoundPerDie*100).toFixed(2)}%</li>
          </ul>
        </div>

        {/* Per-attack metrics */}
        <div className="p-4 rounded-2xl border bg-black/5">
          <h2 className="text-lg font-semibold mb-2">Per-attack (s dice)</h2>
          <ul className="space-y-1 text-sm">
            <li><span className="font-medium">Expected wounds:</span> {out.expectedWounds.toFixed(3)}</li>
            <li><span className="font-medium">Expected crits:</span> {out.expectedCrits.toFixed(3)}</li>
            <li><span className="font-medium">P(≥1 wound):</span> {(out.pAtLeast1Wound*100).toFixed(2)}%</li>
            <li><span className="font-medium">P(≥1 crit):</span> {(out.pAtLeast1Crit*100).toFixed(2)}%</li>
          </ul>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-4 rounded-2xl border bg-black/5">
          <h3 className="font-semibold mb-2">Expected Values per Attack</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={[{ name: "Wounds", value: out.expectedWounds }, { name: "Crits", value: out.expectedCrits }]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={kTick} />
              <YAxis tick={kTick} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Expected count" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="p-4 rounded-2xl border bg-black/5">
          <h3 className="font-semibold mb-2">Reliability (Chance of ≥1)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={[{ name: "≥1 Wound", value: out.pAtLeast1Wound }, { name: "≥1 Crit", value: out.pAtLeast1Crit }]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={kTick} />
              <YAxis tickFormatter={(v)=>`${Math.round(v*100)}%`} tick={kTick} />
              <Tooltip formatter={(v)=>`${(v*100).toFixed(2)}%`} />
              <Legend />
              <Bar dataKey="value" name="Probability" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-4 rounded-2xl border bg-black/5">
          <h3 className="font-semibold mb-2">Distribution: Exactly k Wounds</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={out.woundsDist.map(d=>({ name: d.k, p: d.p }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={kTick} />
              <YAxis tickFormatter={(v)=>`${Math.round(v*100)}%`} tick={kTick} />
              <Tooltip formatter={(v)=>`${(v*100).toFixed(2)}%`} />
              <Legend />
              <Line type="monotone" dataKey="p" name="P(exactly k)" dot />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="p-4 rounded-2xl border bg-black/5">
          <h3 className="font-semibold mb-2">Distribution: Exactly k Crits</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={out.critsDist.map(d=>({ name: d.k, p: d.p }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={kTick} />
              <YAxis tickFormatter={(v)=>`${Math.round(v*100)}%`} tick={kTick} />
              <Tooltip formatter={(v)=>`${(v*100).toFixed(2)}%`} />
              <Legend />
              <Line type="monotone" dataKey="p" name="P(exactly k)" dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="text-xs opacity-70">Notes: 1 always fails on d10; thresholds clamped to [2,10]. Liberal union for "any wound" uses max(wound, crit-window) on the wound roll; strict uses wound threshold only.<br></br> And remember, I am the Dungeon Guru and you should stay safe down there.</div>
    </div>
  );
}
