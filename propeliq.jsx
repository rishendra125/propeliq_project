import React, { useState, useMemo } from "react";

/* ---------------------------------------------------------
   PropelIQ — AI-Powered Commercial Proposal Intelligence
   Module 1: Proposal Builder
   Module 2: Benchmarking Intelligence
   Connected via a shared "value hypothesis" state object
--------------------------------------------------------- */

const BENCHMARKS = {
  Procurement: {
    "Financial Services": {
      metrics: [
        { name: "Procurement Cost as % of Spend", avg: 2.8, best: 1.4, unit: "%", invert: true },
        { name: "Maverick Spend", avg: 22, best: 8, unit: "%", invert: true },
        { name: "Supplier Consolidation Ratio", avg: 45, best: 18, unit: "suppliers/category", invert: true },
      ],
    },
    "Consumer Goods": {
      metrics: [
        { name: "Procurement Cost as % of Spend", avg: 3.2, best: 1.6, unit: "%", invert: true },
        { name: "Maverick Spend", avg: 18, best: 6, unit: "%", invert: true },
        { name: "Supplier Consolidation Ratio", avg: 60, best: 25, unit: "suppliers/category", invert: true },
      ],
    },
    Technology: {
      metrics: [
        { name: "Procurement Cost as % of Spend", avg: 2.2, best: 1.1, unit: "%", invert: true },
        { name: "Maverick Spend", avg: 15, best: 5, unit: "%", invert: true },
        { name: "Supplier Consolidation Ratio", avg: 30, best: 12, unit: "suppliers/category", invert: true },
      ],
    },
  },
  "Supply Chain": {
    "Financial Services": {
      metrics: [
        { name: "Order Cycle Time", avg: 9.5, best: 4.2, unit: "days", invert: true },
        { name: "Inventory Carrying Cost", avg: 24, best: 14, unit: "%", invert: true },
      ],
    },
    "Consumer Goods": {
      metrics: [
        { name: "Order Cycle Time", avg: 6.8, best: 2.5, unit: "days", invert: true },
        { name: "Inventory Carrying Cost", avg: 28, best: 16, unit: "%", invert: true },
        { name: "Perfect Order Rate", avg: 88, best: 97, unit: "%" },
      ],
    },
    Technology: {
      metrics: [
        { name: "Order Cycle Time", avg: 5.4, best: 1.8, unit: "days", invert: true },
        { name: "Inventory Carrying Cost", avg: 21, best: 11, unit: "%", invert: true },
      ],
    },
  },
  Manufacturing: {
    "Financial Services": { metrics: [], na: true },
    "Consumer Goods": {
      metrics: [
        { name: "OEE (Overall Equipment Effectiveness)", avg: 62, best: 85, unit: "%" },
        { name: "Scrap / Waste Rate", avg: 4.5, best: 1.2, unit: "%", invert: true },
        { name: "Unplanned Downtime", avg: 12, best: 4, unit: "% of runtime", invert: true },
      ],
    },
    Technology: {
      metrics: [
        { name: "OEE (Overall Equipment Effectiveness)", avg: 68, best: 88, unit: "%" },
        { name: "Scrap / Waste Rate", avg: 2.8, best: 0.7, unit: "%", invert: true },
      ],
    },
  },
  Operations: {
    "Financial Services": {
      metrics: [
        { name: "Cost-to-Income Ratio", avg: 58, best: 42, unit: "%", invert: true },
        { name: "Straight-Through Processing Rate", avg: 72, best: 94, unit: "%" },
      ],
    },
    "Consumer Goods": {
      metrics: [
        { name: "SG&A as % of Revenue", avg: 19, best: 11, unit: "%", invert: true },
        { name: "Process Automation Coverage", avg: 35, best: 70, unit: "%" },
      ],
    },
    Technology: {
      metrics: [
        { name: "SG&A as % of Revenue", avg: 22, best: 13, unit: "%", invert: true },
        { name: "Process Automation Coverage", avg: 48, best: 82, unit: "%" },
      ],
    },
  },
  HR: {
    "Financial Services": {
      metrics: [
        { name: "HR Cost per Employee (Index, Median = 100)", avg: 108, best: 61, unit: "idx", invert: true },
        { name: "Voluntary Attrition Rate", avg: 17, best: 9, unit: "%", invert: true },
      ],
    },
    "Consumer Goods": {
      metrics: [
        { name: "HR Cost per Employee (Index, Median = 100)", avg: 82, best: 45, unit: "idx", invert: true },
        { name: "Voluntary Attrition Rate", avg: 21, best: 12, unit: "%", invert: true },
      ],
    },
    Technology: {
      metrics: [
        { name: "HR Cost per Employee (Index, Median = 100)", avg: 129, best: 73, unit: "idx", invert: true },
        { name: "Voluntary Attrition Rate", avg: 24, best: 13, unit: "%", invert: true },
      ],
    },
  },
};

const FUNCTIONS = Object.keys(BENCHMARKS);
const INDUSTRIES = ["Financial Services", "Consumer Goods", "Technology"];
const ENGAGEMENT_TYPES = ["Cost Reduction", "Procurement", "Supply Chain", "Operations"];

async function callClaude(systemPrompt, userPrompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  const textBlock = (data.content || []).find((b) => b.type === "text");
  if (!textBlock) throw new Error("No text response from model");
  return textBlock.text;
}

function parseJsonFromModel(raw) {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

const COLORS = {
  ink: "#1B2333",
  paper: "#F3F1EC",
  panel: "#FFFFFF",
  rule: "#D8D3C7",
  brass: "#9C7A3C",
  brassSoft: "#EDE3CE",
  teal: "#28564F",
  tealSoft: "#DCEAE6",
  rust: "#8A3B2B",
  rustSoft: "#F0DDD6",
  muted: "#6B6558",
};

function gapPct(m) {
  if (m.avg === 0) return 0;
  const raw = m.invert ? (m.avg - m.best) / m.avg : (m.best - m.avg) / m.avg;
  return Math.round(raw * 100);
}

function BenchmarkBar({ m }) {
  const max = Math.max(m.avg, m.best) * 1.15 || 1;
  const avgPct = (m.avg / max) * 100;
  const bestPct = (m.best / max) * 100;
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: COLORS.ink, fontWeight: 600 }}>{m.name}</span>
        <span style={{ fontSize: 12, color: gapPct(m) >= 0 ? COLORS.teal : COLORS.rust, fontWeight: 700 }}>
          {gapPct(m) >= 0 ? "+" : ""}{gapPct(m)}% gap to best-in-class
        </span>
      </div>
      <div style={{ position: "relative", height: 26, background: "#EDEAE1", borderRadius: 3 }}>
        <div
          style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: `${avgPct}%`,
            background: COLORS.muted, opacity: 0.35, borderRadius: 3,
          }}
        />
        <div
          style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: `${bestPct}%`,
            borderRight: `3px solid ${COLORS.teal}`,
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11.5, color: COLORS.muted }}>
        <span>Industry avg: {m.avg}{m.unit === "%" ? "%" : m.unit === "idx" ? " idx" : ` ${m.unit}`}</span>
        <span style={{ color: COLORS.teal, fontWeight: 600 }}>
          Best-in-class: {m.best}{m.unit === "%" ? "%" : m.unit === "idx" ? " idx" : ` ${m.unit}`}
        </span>
      </div>
    </div>
  );
}

function generateInsights(fn, industry, metrics) {
  if (!metrics.length) return [];
  return metrics.map((m) => {
    const gap = gapPct(m);
    const says = `${fn} performance in ${industry} shows a ${Math.abs(gap)}% ${gap >= 0 ? "gap" : "lead"} between industry average and best-in-class on ${m.name.toLowerCase()}.`;
    const means =
      gap >= 15
        ? `A gap this wide usually signals structural inefficiency rather than a one-off — process design, tooling, or governance is likely the root cause, not effort.`
        : gap >= 5
        ? `A moderate gap suggests targeted fixes rather than a full redesign — likely a handful of high-leverage processes are dragging the average down.`
        : `The client is already close to best-in-class here — this is a maintain-and-monitor metric, not a transformation lever.`;
    const action =
      gap >= 15
        ? `Position this as a primary value creation theme in the proposal — quantify the gap in dollar terms and anchor the hypothesis on closing it.`
        : gap >= 5
        ? `Include as a secondary value lever — pair with a quick-win pilot to build credibility before the larger ask.`
        : `Mention briefly for completeness; don't lead the proposal narrative with it.`;
    return { metric: m.name, says, means, action, gap };
  });
}

function ModuleTabs({ active, setActive }) {
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 28 }}>
      {[
        { id: "builder", label: "01 — Proposal Builder" },
        { id: "benchmark", label: "02 — Benchmarking Intelligence" },
      ].map((t) => (
        <button
          key={t.id}
          onClick={() => setActive(t.id)}
          style={{
            flex: 1, padding: "14px 18px", fontSize: 13.5, fontWeight: 600, letterSpacing: 0.1,
            fontFamily: "'Source Sans Pro', -apple-system, sans-serif",
            background: active === t.id ? COLORS.ink : "transparent",
            color: active === t.id ? COLORS.paper : COLORS.ink,
            border: `1.5px solid ${COLORS.ink}`,
            borderRadius: 0, cursor: "pointer", transition: "background 0.15s",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: COLORS.muted, marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const selectStyle = {
  width: "100%", padding: "10px 12px", fontSize: 14, border: `1.5px solid ${COLORS.rule}`,
  borderRadius: 2, background: COLORS.panel, color: COLORS.ink, fontFamily: "inherit",
};

const textareaStyle = {
  ...selectStyle, minHeight: 76, resize: "vertical", lineHeight: 1.5,
};

function ProposalBuilder({ inheritedHypothesis }) {
  const [industry, setIndustry] = useState("Consumer Goods");
  const [problem, setProblem] = useState(
    "Rising procurement costs and fragmented supplier base are eroding margins amid inflationary pressure on raw materials."
  );
  const [engagementType, setEngagementType] = useState("Procurement");
  const [outline, setOutline] = useState(null);
  const [storyCheck, setStoryCheck] = useState(null);
  const [useInherited, setUseInherited] = useState(!!inheritedHypothesis);
  const [loadingOutline, setLoadingOutline] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [error, setError] = useState(null);

  async function buildOutline() {
    setLoadingOutline(true);
    setError(null);
    setStoryCheck(null);

    const hypothesisHint = useInherited && inheritedHypothesis
      ? `The value hypothesis MUST be exactly this (benchmark-derived, do not alter the core claim): "${inheritedHypothesis.text}"`
      : `Derive a plausible, specific value hypothesis for a ${engagementType} engagement — it should name a concrete lever, not a vague claim.`;

    const systemPrompt = `You are a senior management consultant drafting a proposal outline. Return ONLY valid JSON, no preamble, no markdown fences, matching exactly this shape:
{"executiveSummary": string, "problemFraming": string, "hypothesis": string, "approach": [string, string, string, string], "valueThemes": [string, string, string]}
Keep each field concise (2-3 sentences max for prose fields, one line per array item). Write in a confident, MECE, hypothesis-driven consulting voice. Never use placeholder brackets.
IMPORTANT — do not fabricate false precision: if the client's problem statement is short, vague, or lacks concrete detail (e.g. "costs are too high"), do NOT invent specific dollar figures, percentages, vendor counts, or timelines that aren't implied by the input. In that case, keep the language directional (e.g. "a meaningful reduction," "to be sized during diagnostic") rather than manufacturing precise numbers, and the hypothesis should explicitly note it needs validation against real client data. Only use specific quantification when the problem statement itself contains enough detail to plausibly support it.`;

    const userPrompt = `Client industry: ${industry}
Problem statement: ${problem}
Engagement type: ${engagementType}
${hypothesisHint}
Generate the proposal outline JSON now.`;

    try {
      const raw = await callClaude(systemPrompt, userPrompt);
      const parsed = parseJsonFromModel(raw);
      setOutline(parsed);
    } catch (e) {
      setError("Couldn't reach the model — showing a structural placeholder instead. " + e.message);
      setOutline({
        executiveSummary: `${industry} client facing ${problem.toLowerCase()} We propose a ${engagementType.toLowerCase()}-led intervention structured around a benchmark-validated value hypothesis.`,
        problemFraming: `The core tension: ${problem}`,
        hypothesis: useInherited && inheritedHypothesis ? inheritedHypothesis.text : `${engagementType} inefficiencies relative to peer benchmarks represent the largest addressable margin opportunity for this client.`,
        approach: [
          "Diagnostic — baseline current state against external benchmarks",
          "Design — build the target operating model and roadmap",
          "Mobilize — stand up governance and quick-win pilots",
          "Scale — roll out initiatives with tracked value capture",
        ],
        valueThemes: [
          `Close the benchmark gap in ${engagementType.toLowerCase()}`,
          "Reduce cost-to-serve via consolidation and renegotiation",
          "Build durable governance so gains don't erode",
        ],
      });
    } finally {
      setLoadingOutline(false);
    }
  }

  async function runStorytellingCheck() {
    if (!outline) return;
    setLoadingCheck(true);
    setError(null);

    const systemPrompt = `You are reviewing a consulting proposal outline for narrative quality AND factual grounding. You will be shown both the client's ORIGINAL, UNEDITED problem statement and the AI-GENERATED outline built from it. Return ONLY valid JSON, no preamble, no markdown fences, matching exactly:
{"passed": boolean, "flags": [string, ...]}
Check specifically:
(1) Groundedness — does the outline's problem framing, hypothesis, and any numbers in it plausibly derive from what the CLIENT actually said in their original problem statement, or has the model invented specifics (dollar figures, percentages, vendor counts, timelines) that go far beyond a thin or vague input? An elaborate, confident outline built from a one-line or generic input is a FAILURE on this criterion even if the outline itself reads smoothly — flag it explicitly as fabricated/unsupported specificity.
(2) Is the hypothesis genuinely hypothesis-driven and specific, not vague?
(3) Does the narrative flow logically from problem to hypothesis to approach to value themes?
(4) Are there enough value creation themes (2+) to feel substantive?
(5) Is the ORIGINAL problem statement itself specific enough to create real tension, independent of how the model embellished it?
If the original problem statement is short, generic, or vague (e.g. "costs are too high"), you MUST fail check (1) and (5) regardless of how polished the resulting outline looks — polish is not the same as being grounded in real client input.
If everything genuinely passes, return passed: true with a single flag summarizing why. Otherwise passed: false with one flag per failed criterion, each specific and actionable.`;

    const userPrompt = `CLIENT'S ORIGINAL, UNEDITED PROBLEM STATEMENT (verbatim, as typed): "${problem}"

AI-GENERATED PROPOSAL OUTLINE BUILT FROM IT:
Executive Summary: ${outline.executiveSummary}
Problem Framing: ${outline.problemFraming}
Hypothesis: ${outline.hypothesis}
Approach: ${outline.approach.join(" | ")}
Value Themes: ${outline.valueThemes.join(" | ")}

Engagement type: ${engagementType}
Run the storytelling check now, comparing the outline against the client's actual original statement above.`;

    try {
      const raw = await callClaude(systemPrompt, userPrompt);
      const parsed = parseJsonFromModel(raw);
      setStoryCheck(parsed);
    } catch (e) {
      setError("Couldn't reach the model for the storytelling check. " + e.message);
      setStoryCheck(null);
    } finally {
      setLoadingCheck(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 32 }}>
      <div>
        <Field label="Client Industry">
          <select style={selectStyle} value={industry} onChange={(e) => setIndustry(e.target.value)}>
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </select>
        </Field>
        <Field label="Problem Statement">
          <textarea style={textareaStyle} value={problem} onChange={(e) => setProblem(e.target.value)} />
        </Field>
        <Field label="Engagement Type">
          <select style={selectStyle} value={engagementType} onChange={(e) => setEngagementType(e.target.value)}>
            {ENGAGEMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>

        {inheritedHypothesis && (
          <div
            style={{
              padding: 12, background: COLORS.tealSoft, border: `1px solid ${COLORS.teal}`,
              borderRadius: 2, marginBottom: 18, fontSize: 12.5,
            }}
          >
            <div style={{ fontWeight: 700, color: COLORS.teal, marginBottom: 4 }}>
              Benchmark data available from Module 2
            </div>
            <div style={{ color: COLORS.ink, marginBottom: 8, lineHeight: 1.45 }}>
              "{inheritedHypothesis.text}"
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={useInherited} onChange={(e) => setUseInherited(e.target.checked)} />
              Use this as the value hypothesis
            </label>
          </div>
        )}

        <button
          onClick={buildOutline}
          disabled={loadingOutline}
          style={{
            width: "100%", padding: "12px 16px", background: COLORS.ink, color: COLORS.paper,
            border: "none", fontSize: 13.5, fontWeight: 600, cursor: loadingOutline ? "default" : "pointer",
            letterSpacing: 0.2, opacity: loadingOutline ? 0.6 : 1,
          }}
        >
          {loadingOutline ? "Generating…" : "Generate Proposal Outline"}
        </button>

        {error && (
          <div style={{ marginTop: 12, padding: 10, background: COLORS.rustSoft, color: COLORS.rust, fontSize: 12, lineHeight: 1.5 }}>
            {error}
          </div>
        )}
      </div>

      <div>
        {!outline && (
          <div style={{ color: COLORS.muted, fontSize: 14, paddingTop: 40, textAlign: "center" }}>
            Fill in the inputs and generate an outline to see it here.
          </div>
        )}
        {outline && (
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, padding: "28px 32px" }}>
            <Section title="Executive Summary" body={outline.executiveSummary} />
            <Section title="Problem Framing" body={outline.problemFraming} />
            <Section title="Hypothesis" body={outline.hypothesis} accent />
            <div style={{ marginBottom: 20 }}>
              <SectionLabel>Approach</SectionLabel>
              <ol style={{ margin: 0, paddingLeft: 20, color: COLORS.ink, fontSize: 14, lineHeight: 1.7 }}>
                {outline.approach.map((a, i) => <li key={i}>{a}</li>)}
              </ol>
            </div>
            <div style={{ marginBottom: 8 }}>
              <SectionLabel>Value Creation Themes</SectionLabel>
              <ul style={{ margin: 0, paddingLeft: 20, color: COLORS.ink, fontSize: 14, lineHeight: 1.7 }}>
                {outline.valueThemes.map((v, i) => <li key={i}>{v}</li>)}
              </ul>
            </div>

            <div style={{ borderTop: `1px solid ${COLORS.rule}`, marginTop: 24, paddingTop: 20 }}>
              <button
                onClick={runStorytellingCheck}
                disabled={loadingCheck}
                style={{
                  padding: "9px 16px", background: "transparent", color: COLORS.brass,
                  border: `1.5px solid ${COLORS.brass}`, fontSize: 13, fontWeight: 600,
                  cursor: loadingCheck ? "default" : "pointer", opacity: loadingCheck ? 0.6 : 1,
                }}
              >
                {loadingCheck ? "Checking…" : "Storytelling Check"}
              </button>

              {storyCheck && (
                <div
                  style={{
                    marginTop: 16, padding: 14,
                    background: storyCheck.passed ? COLORS.tealSoft : COLORS.rustSoft,
                    border: `1px solid ${storyCheck.passed ? COLORS.teal : COLORS.rust}`,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: storyCheck.passed ? COLORS.teal : COLORS.rust }}>
                    {storyCheck.passed ? "Narrative check passed" : `${storyCheck.flags.length} issue(s) flagged`}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: COLORS.ink }}>
                    {storyCheck.flags.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.brass, marginBottom: 6, letterSpacing: 0.3 }}>
      {children}
    </div>
  );
}

function Section({ title, body, accent }) {
  return (
    <div style={{ marginBottom: 20, ...(accent ? { padding: 14, background: COLORS.brassSoft, borderLeft: `3px solid ${COLORS.brass}` } : {}) }}>
      <SectionLabel>{title}</SectionLabel>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: COLORS.ink }}>{body}</p>
    </div>
  );
}

function BenchmarkingIntelligence({ onSendToProposal }) {
  const [fn, setFn] = useState("Procurement");
  const [industry, setIndustry] = useState("Consumer Goods");
  const [ran, setRan] = useState(true);

  const data = BENCHMARKS[fn][industry];
  const insights = useMemo(() => generateInsights(fn, industry, data.metrics), [fn, industry]);
  const topInsight = insights.length ? [...insights].sort((a, b) => b.gap - a.gap)[0] : null;

  function sendToProposal() {
    if (!topInsight) return;
    onSendToProposal({
      text: `Closing the ${topInsight.gap}% benchmark gap on ${topInsight.metric.toLowerCase()} (${fn}, ${industry}) represents the primary value creation opportunity for this engagement.`,
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 32 }}>
      <div>
        <Field label="Business Function">
          <select style={selectStyle} value={fn} onChange={(e) => { setFn(e.target.value); setRan(true); }}>
            {FUNCTIONS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </Field>
        <Field label="Industry">
          <select style={selectStyle} value={industry} onChange={(e) => { setIndustry(e.target.value); setRan(true); }}>
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </select>
        </Field>
        <div style={{ fontSize: 12.5, color: COLORS.muted, lineHeight: 1.5, marginTop: 24 }}>
          Benchmarks shown are illustrative synthetic figures for demonstration. A production build would connect to
          internal benchmarking repositories or licensed sources (Gartner, Forrester).
        </div>
      </div>

      <div>
        {data.na ? (
          <div style={{ padding: 32, textAlign: "center", color: COLORS.muted, border: `1px dashed ${COLORS.rule}` }}>
            Manufacturing benchmarks aren't typically tracked for {industry} — this function/industry pair
            falls outside standard benchmarking scope.
          </div>
        ) : (
          <>
            <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, padding: "24px 28px", marginBottom: 20 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.brass, letterSpacing: 0.3, marginBottom: 16 }}>
                {fn.toUpperCase()} · {industry.toUpperCase()}
              </div>
              {data.metrics.map((m, i) => <BenchmarkBar key={i} m={m} />)}
            </div>

            <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, padding: "22px 28px" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.teal, letterSpacing: 0.3, marginBottom: 16 }}>
                KEY INSIGHTS
              </div>
              {insights.map((ins, i) => (
                <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < insights.length - 1 ? `1px solid ${COLORS.rule}` : "none" }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: COLORS.ink, marginBottom: 6 }}>{ins.metric}</div>
                  <p style={{ margin: "0 0 4px", fontSize: 13, lineHeight: 1.55 }}>
                    <span style={{ fontWeight: 600, color: COLORS.muted }}>What the data says — </span>{ins.says}
                  </p>
                  <p style={{ margin: "0 0 4px", fontSize: 13, lineHeight: 1.55 }}>
                    <span style={{ fontWeight: 600, color: COLORS.muted }}>What it means — </span>{ins.means}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>
                    <span style={{ fontWeight: 600, color: COLORS.muted }}>Recommended action — </span>{ins.action}
                  </p>
                </div>
              ))}

              <button
                onClick={sendToProposal}
                style={{
                  marginTop: 4, padding: "10px 16px", background: COLORS.teal, color: "#fff",
                  border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Send top insight to Proposal Builder →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PropelIQ() {
  const [active, setActive] = useState("builder");
  const [hypothesis, setHypothesis] = useState(null);

  return (
    <div style={{ background: COLORS.paper, minHeight: "100%", padding: "36px 40px", fontFamily: "'Source Sans Pro', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.brass, letterSpacing: 0.4, marginBottom: 4 }}>
            PROPELIQ
          </div>
          <h1 style={{
            margin: 0, fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 30, fontWeight: 400,
            color: COLORS.ink, letterSpacing: -0.2,
          }}>
            Commercial Proposal Intelligence
          </h1>
          <p style={{ margin: "6px 0 0", color: COLORS.muted, fontSize: 14 }}>
            Benchmark-grounded proposal generation — from industry data to a defensible value hypothesis.
          </p>
        </div>

        <ModuleTabs active={active} setActive={setActive} />

        {active === "builder" ? (
          <ProposalBuilder inheritedHypothesis={hypothesis} />
        ) : (
          <BenchmarkingIntelligence
            onSendToProposal={(h) => { setHypothesis(h); setActive("builder"); }}
          />
        )}
      </div>
    </div>
  );
}
