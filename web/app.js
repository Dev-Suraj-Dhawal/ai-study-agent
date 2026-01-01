const API = "http://localhost:8080";

const $ = (id) => document.getElementById(id);

function setToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  $("startDate").value = `${yyyy}-${mm}-${dd}`;
}

async function health() {
  const btn = $("healthBtn");
  btn.textContent = "Server: checking…";
  try {
    const r = await fetch(`${API}/health`);
    const j = await r.json();
    btn.textContent = j.ok ? "Server: online" : "Server: error";
  } catch {
    btn.textContent = "Server: offline";
  }
}

async function saveNotes() {
  $("saveStatus").textContent = "Saving…";
  const body = {
    title: $("noteTitle").value.trim() || "Untitled",
    text: $("noteText").value.trim()
  };
  try {
    const r = await fetch(`${API}/api/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Failed");
    $("saveStatus").textContent = `Saved. Chunks: ${j.chunkCount}. Risk: ${j.injectionRisk?.risky ? "risky" : "ok"}`;
  } catch (e) {
    $("saveStatus").textContent = `Error: ${e.message}`;
  }
}

async function ask() {
  $("answerText").textContent = "Thinking…";
  $("citations").innerHTML = "";
  try {
    const r = await fetch(`${API}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: $("question").value.trim(), topK: 5 })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Failed");

    $("answerText").textContent = j.answer;

    for (const c of j.citations) {
      const div = document.createElement("div");
      div.className = "cite";
      div.innerHTML = `
        <div class="meta">
          <span>${c.docTitle} • ${c.chunkId}</span>
          <span>score ${c.score.toFixed(2)}</span>
        </div>
        <div class="ex">${escapeHtml(c.excerpt)}</div>
      `;
      $("citations").appendChild(div);
    }
  } catch (e) {
    $("answerText").textContent = `Error: ${e.message}`;
  }
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (ch) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

async function downloadIcs() {
  $("planStatus").textContent = "Generating…";
  const start = $("startDate").value;
  const startDateISO = new Date(`${start}T00:00:00`).toISOString();

  const body = {
    goals: $("goal").value.trim(),
    startDateISO,
    timezone: $("tz").value.trim(),
    sessionMinutes: Number($("minutes").value),
    sessionsPerWeek: Number($("sessions").value)
  };

  try {
    const r = await fetch(`${API}/api/plan-week`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j.error || "Failed to create calendar.");
    }

    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "study-plan.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    $("planStatus").textContent = "Downloaded study-plan.ics";
  } catch (e) {
    $("planStatus").textContent = `Error: ${e.message}`;
  }
}

function seedDemo() {
  $("noteTitle").value = "Logic Gates — Quick Notes";
  $("noteText").value =
`AND gate outputs 1 only if all inputs are 1.
OR gate outputs 1 if any input is 1.
NOT gate inverts the input.
NAND is NOT(AND), NOR is NOT(OR).
XOR outputs 1 if inputs are different.
Truth tables define outputs for each input combination.`;
  $("question").value = "Explain XOR gate with a simple example.";
  $("goal").value = "Digital Logic practice (gates + truth tables)";
}

$("healthBtn").addEventListener("click", (e) => { e.preventDefault(); health(); });
$("saveNotes").addEventListener("click", saveNotes);
$("askBtn").addEventListener("click", ask);
$("downloadIcs").addEventListener("click", downloadIcs);
$("seedBtn").addEventListener("click", seedDemo);

setToday();
health();
