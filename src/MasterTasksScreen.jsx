import React, { useState } from "react";

export default function MasterTasksScreen({ userContext = {}, onCreateTermine = () => {} }) {
  const [masterTasks, setMasterTasks] = useState([]);
  const [newTask, setNewTask] = useState({ name: "", priority: "YELLOW", duration: 30, dependencies: "" });
  const [optimizedPlan, setOptimizedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(true);

  // 🟢 ADD TASK
  const addTask = () => {
    if (!newTask.name.trim()) return;
    const task = {
      id: Date.now(),
      name: newTask.name,
      priority: newTask.priority,
      duration: parseInt(newTask.duration) || 30,
      blockedBy: newTask.dependencies.split(",").map(d => d.trim()).filter(d => d),
      criteria: [],
    };
    setMasterTasks([...masterTasks, task]);
    setNewTask({ name: "", priority: "YELLOW", duration: 30, dependencies: "" });
  };

  // 🤖 CLAUDE OPTIMIZER
  const optimizeWithClaude = async () => {
    if (masterTasks.length === 0) return;
    setLoading(true);

    const prompt = `Du bist Verenas Task-Optimizer. 

KONTEXT:
- Montag = Goldzeit (beste Produktivität, ungestört bis 15:00)
- Beste Fenster: Mo morgen, Mi/Do 12–15 Uhr
- Kinder blockieren ab 15:00/15:30
- Di–Fr: 8–12 Uhr arbeiten
- Nachhilfe: Do 17:00

MASTER TASKS:
${masterTasks.map(t => `- ${t.name} (${t.priority}, ${t.duration}min, blockiert durch: ${t.blockedBy.join(", ") || "nichts"})`).join("\n")}

Optimiere diese Tasks und antworte NUR mit JSON (keine anderen Worte):

{
  "optimization": "kurze Zusammenfassung",
  "schedule": [
    {
      "day": "Montag 03.06",
      "slots": [
        {
          "time": "09:00–09:45",
          "task": "Task Name",
          "priority": "RED/YELLOW/GREEN",
          "status": "BEREIT/BLOCKIERT/ERLEDIGT",
          "duration": 45,
          "blockedBy": [],
          "unlocks": [],
          "reason": "warum jetzt"
        }
      ]
    }
  ],
  "recommendations": ["empfehlung 1"]
}`;

    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: "Du bist JSON-only API. Antworte IMMER mit Valid JSON, keine Worte davor/danach.",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await res.json();
      const responseText = data.content?.[0]?.text || "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const plan = JSON.parse(jsonMatch[0]);
        setOptimizedPlan(plan);
        setShowForm(false);
      }
    } catch (e) {
      console.error("Claude Error:", e);
    }

    setLoading(false);
  };

  // 📅 EXPORT TO CALENDAR
  const exportToCalendar = () => {
    if (!optimizedPlan) return;
    const termine = [];
    
    optimizedPlan.schedule.forEach(dayData => {
      dayData.slots?.forEach(slot => {
        termine.push({
          title: `📋 ${slot.task} [${slot.priority}]`,
          description: `Status: ${slot.status}\nBlockiert durch: ${slot.blockedBy.join(", ") || "nichts"}\nFreigegeben: ${slot.unlocks.join(", ") || "keine"}`,
          time: slot.time.split("–")[0],
          duration: slot.duration,
        });
      });
    });

    onCreateTermine(termine);
    alert(`✅ ${termine.length} Termine ins Kalender übernommen!`);
  };

  // 🎨 COLORS
  const priorityColor = { RED: "#EF4444", YELLOW: "#EAB308", GREEN: "#22C55E" };
  const statusColor = { BEREIT: "#22C55E", BLOCKIERT: "#EF4444", ERLEDIGT: "#9CA3AF" };

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto", padding: "16px", fontFamily: "system-ui" }}>
      {/* HEADER */}
      <h2 style={{ marginBottom: "20px" }}>📋 Master-Aufgaben Optimizer</h2>

      {showForm ? (
        <>
          {/* INPUT FORM */}
          <div style={{ background: "#f9fafb", padding: "16px", borderRadius: "12px", marginBottom: "16px" }}>
            <h3>Neue Master-Aufgabe</h3>
            <div style={{ marginBottom: "12px" }}>
              <input
                type="text"
                placeholder="Aufgabenname"
                value={newTask.name}
                onChange={e => setNewTask({ ...newTask, name: e.target.value })}
                style={{ width: "100%", padding: "8px", marginBottom: "8px", borderRadius: "6px", border: "1px solid #ddd" }}
              />
              <select
                value={newTask.priority}
                onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                style={{ marginRight: "8px", padding: "6px" }}
              >
                <option value="GREEN">🟢 GREEN (Normal)</option>
                <option value="YELLOW">🟡 YELLOW (Wichtig)</option>
                <option value="RED">🔴 RED (Kritisch)</option>
              </select>
              <input
                type="number"
                placeholder="Dauer (Min)"
                value={newTask.duration}
                onChange={e => setNewTask({ ...newTask, duration: e.target.value })}
                style={{ width: "100px", padding: "6px", marginRight: "8px" }}
              />
            </div>
            <textarea
              placeholder="Blockiert durch: [Task1, Task2] (komma-separiert)"
              value={newTask.dependencies}
              onChange={e => setNewTask({ ...newTask, dependencies: e.target.value })}
              style={{ width: "100%", padding: "8px", minHeight: "60px", borderRadius: "6px", border: "1px solid #ddd" }}
            />
            <button
              onClick={addTask}
              style={{
                background: "#3B82F6",
                color: "white",
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                marginTop: "8px",
              }}
            >
              ➕ Task hinzufügen
            </button>
          </div>

          {/* TASK LIST */}
          {masterTasks.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <h3>Tasks ({masterTasks.length})</h3>
              {masterTasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    background: "#f3f4f6",
                    padding: "10px",
                    marginBottom: "8px",
                    borderRadius: "8px",
                    borderLeft: `4px solid ${priorityColor[task.priority]}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>{task.name}</strong>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      {task.duration}min • {task.priority} {task.blockedBy.length > 0 && `• Blockiert: ${task.blockedBy.join(", ")}`}
                    </div>
                  </div>
                  <button
                    onClick={() => setMasterTasks(masterTasks.filter(t => t.id !== task.id))}
                    style={{
                      background: "#EF4444",
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* OPTIMIZE BUTTON */}
          <button
            onClick={optimizeWithClaude}
            disabled={masterTasks.length === 0 || loading}
            style={{
              background: loading ? "#9CA3AF" : "#10B981",
              color: "white",
              padding: "12px 24px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontSize: "16px",
              width: "100%",
              fontWeight: "bold",
            }}
          >
            {loading ? "⏳ Optimiert..." : "📊 Mit KI optimieren"}
          </button>
        </>
      ) : optimizedPlan ? (
        <>
          {/* OPTIMIZATION RESULTS */}
          <div style={{ marginBottom: "16px", padding: "12px", background: "#f0fdf4", borderRadius: "8px" }}>
            <h3>✨ Optimierter Plan</h3>
            <p>{optimizedPlan.optimization}</p>
          </div>

          {/* SCHEDULE */}
          <h3>📅 Geplante Zeitfenster</h3>
          {optimizedPlan.schedule?.map((day, dayIdx) => (
            <div key={dayIdx} style={{ marginBottom: "16px" }}>
              <h4 style={{ color: "#666" }}>{day.day}</h4>
              {day.slots?.map((slot, slotIdx) => (
                <div
                  key={slotIdx}
                  style={{
                    background: "#f9fafb",
                    padding: "12px",
                    marginBottom: "8px",
                    borderRadius: "8px",
                    borderLeft: `4px solid ${priorityColor[slot.priority]}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <strong>{slot.time}</strong>
                    <span
                      style={{
                        background: statusColor[slot.status],
                        color: "white",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}
                    >
                      {slot.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "500" }}>{slot.task}</div>
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>{slot.reason}</div>
                  {slot.unlocks?.length > 0 && (
                    <div style={{ fontSize: "11px", color: "#10B981", marginTop: "4px" }}>
                      ✓ Freigegeben: {slot.unlocks.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* RECOMMENDATIONS */}
          {optimizedPlan.recommendations?.length > 0 && (
            <div style={{ background: "#fef3c7", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
              <h4>💡 Empfehlungen</h4>
              <ul style={{ marginLeft: "16px", fontSize: "14px" }}>
                {optimizedPlan.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* BUTTONS */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setShowForm(true)}
              style={{
                flex: 1,
                background: "#9CA3AF",
                color: "white",
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
              }}
            >
              ← Zurück
            </button>
            <button
              onClick={exportToCalendar}
              style={{
                flex: 1,
                background: "#3B82F6",
                color: "white",
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
              }}
            >
              📅 Ins Kalender
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
