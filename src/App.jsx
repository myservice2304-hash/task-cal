import { useState, useMemo, useRef } from "react";

const SAMPLE_TASKS = [
  { id: 1, client: "株式会社アルファ", title: "要件定義書作成", due: "2026-04-24", priority: "high", status: "in_progress" },
  { id: 2, client: "株式会社アルファ", title: "DB設計レビュー", due: "2026-04-28", priority: "medium", status: "todo" },
  { id: 3, client: "ベータ工業", title: "サーバー設定", due: "2026-04-22", priority: "high", status: "done" },
  { id: 4, client: "ベータ工業", title: "テスト仕様書作成", due: "2026-05-01", priority: "low", status: "todo" },
  { id: 5, client: "ガンマ商事", title: "API設計", due: "2026-04-25", priority: "high", status: "in_progress" },
  { id: 6, client: "ガンマ商事", title: "納品物確認", due: "2026-04-30", priority: "medium", status: "todo" },
  { id: 7, client: "株式会社アルファ", title: "進捗報告MTG", due: "2026-04-23", priority: "medium", status: "todo" },
];

const CLIENT_COLORS = [
  { accent: "#2980b9", bg: "#e8f4fb" },
  { accent: "#e67e22", bg: "#fef3e8" },
  { accent: "#27ae60", bg: "#eaf7ea" },
  { accent: "#8e44ad", bg: "#f5eefa" },
  { accent: "#c0392b", bg: "#fdecea" },
];

const PRIORITY_CONFIG = {
  high:   { label: "高", color: "#e74c3c", bg: "#fdecea" },
  medium: { label: "中", color: "#e67e22", bg: "#fef9e7" },
  low:    { label: "低", color: "#27ae60", bg: "#eafaf1" },
};

const STATUS_CONFIG = {
  todo:        { label: "未着手", color: "#7f8c8d", bg: "#f4f6f6" },
  in_progress: { label: "進行中", color: "#2980b9", bg: "#ebf5fb" },
  done:        { label: "完了",   color: "#27ae60", bg: "#eafaf1" },
};

const DAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function BottomSheet({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "#fff", borderRadius: "20px 20px 0 0",
        maxHeight: "90vh", display: "flex", flexDirection: "column",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.18)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 40, height: 4, background: "#dce1e7", borderRadius: 2 }} />
        </div>
        {title && (
          <div style={{ padding: "4px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: "1px solid #f0f0f0" }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#1a2740" }}>{title}</span>
            <button onClick={onClose}
              style={{ background: "#f0f4f8", border: "none", borderRadius: "50%", width: 32, height: 32,
                fontSize: 18, color: "#7f8c8d", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              ×
            </button>
          </div>
        )}
        <div style={{ overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

export default function App() {
  const today = new Date(2026, 3, 22);
  const [view, setView] = useState("month");
  const [currentDate, setCurrentDate] = useState(today);
  const [tasks, setTasks] = useState(SAMPLE_TASKS);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [filterClient, setFilterClient] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const touchStartX = useRef(null);

  const clients = useMemo(() => [...new Set(tasks.map(t => t.client))], [tasks]);
  const clientColorMap = useMemo(() => {
    const map = {};
    clients.forEach((c, i) => { map[c] = CLIENT_COLORS[i % CLIENT_COLORS.length]; });
    return map;
  }, [clients]);

  const filtered = tasks.filter(t =>
    (filterClient === "all" || t.client === filterClient) &&
    (filterStatus === "all" || t.status === filterStatus)
  );
  const activeFilterCount = (filterClient !== "all" ? 1 : 0) + (filterStatus !== "all" ? 1 : 0);

  function tasksOnDay(date) {
    return filtered.filter(t => isSameDay(parseDate(t.due), date));
  }

  function prev() {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() - 1);
    else if (view === "week") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  }
  function next() {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() + 1);
    else if (view === "week") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  }

  function openNew(date) {
    setEditTask({ id: null, client: clients[0] || "", title: "", due: formatDate(date || selectedDate), priority: "medium", status: "todo" });
    setShowForm(true);
    setSelectedTask(null);
  }
  function openEdit(task) {
    setEditTask({ ...task });
    setShowForm(true);
    setSelectedTask(null);
  }
  function saveTask() {
    if (!editTask.title || !editTask.client || !editTask.due) return;
    if (editTask.id) {
      setTasks(tasks.map(t => t.id === editTask.id ? editTask : t));
    } else {
      setTasks([...tasks, { ...editTask, id: Date.now() }]);
    }
    setShowForm(false);
  }
  function deleteTask(id) {
    setTasks(tasks.filter(t => t.id !== id));
    setSelectedTask(null);
  }

  function headerTitle() {
    if (view === "month") return `${currentDate.getFullYear()}年 ${currentDate.getMonth()+1}月`;
    if (view === "week") {
      const s = getWeekStart(currentDate), e = new Date(s); e.setDate(e.getDate()+6);
      return `${s.getMonth()+1}/${s.getDate()} 〜 ${e.getMonth()+1}/${e.getDate()}`;
    }
    return "タスク一覧";
  }
  function getWeekStart(d) {
    const s = new Date(d); s.setDate(d.getDate() - d.getDay()); return s;
  }

  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 60) { dx < 0 ? next() : prev(); }
    touchStartX.current = null;
  }

  function TaskCard({ task, onTap, showDate }) {
    const cc = clientColorMap[task.client] || CLIENT_COLORS[0];
    const isDone = task.status === "done";
    const isOverdue = !isDone && parseDate(task.due) < today && !isSameDay(parseDate(task.due), today);
    return (
      <div onClick={onTap}
        style={{ background: "#fff", borderRadius: 12, padding: "12px 14px",
          display: "flex", alignItems: "center", gap: 12,
          boxShadow: "0 1px 6px rgba(0,0,0,0.07)", opacity: isDone ? 0.6 : 1,
          borderLeft: `4px solid ${cc.accent}`, cursor: "pointer" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: cc.accent, fontWeight: 700, marginBottom: 2 }}>{task.client}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#2c3e50", marginBottom: 6,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            textDecoration: isDone ? "line-through" : "none" }}>
            {task.title}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {showDate && (
              <span style={{ fontSize: 11, color: isOverdue ? "#e74c3c" : "#95a5a6", fontWeight: isOverdue ? 700 : 400 }}>
                {isOverdue ? "⚠ " : "📅 "}{task.due}
              </span>
            )}
            <span style={{ fontSize: 11, background: PRIORITY_CONFIG[task.priority].bg,
              color: PRIORITY_CONFIG[task.priority].color, padding: "2px 7px", borderRadius: 4, fontWeight: 700 }}>
              {PRIORITY_CONFIG[task.priority].label}
            </span>
            <span style={{ fontSize: 11, background: STATUS_CONFIG[task.status].bg,
              color: STATUS_CONFIG[task.status].color, padding: "2px 7px", borderRadius: 4 }}>
              {STATUS_CONFIG[task.status].label}
            </span>
          </div>
        </div>
        <div style={{ color: "#dce1e7", fontSize: 20, flexShrink: 0 }}>›</div>
      </div>
    );
  }

  function MonthView() {
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    const selDayTasks = tasksOnDay(selectedDate);

    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", background: "#fff", borderBottom: "1px solid #eee" }}>
          {DAYS_JA.map((d, i) => (
            <div key={d} style={{ textAlign: "center", padding: "8px 2px", fontSize: 12, fontWeight: 700,
              color: i===0 ? "#e74c3c" : i===6 ? "#2980b9" : "#95a5a6" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", background: "#f0f4f8", gap: 1 }}>
          {cells.map((date, idx) => {
            const dayTasks = date ? tasksOnDay(date) : [];
            const isToday = date && isSameDay(date, today);
            const isSelected = date && isSameDay(date, selectedDate);
            const isPast = date && date < today && !isToday;
            const highCount = dayTasks.filter(t => t.priority === "high" && t.status !== "done").length;
            return (
              <div key={idx} onClick={() => date && setSelectedDate(date)}
                style={{ background: isSelected ? "#1a2740" : isToday ? "#fffbf0" : "#fff",
                  padding: "6px 2px 8px", minHeight: 58, cursor: date ? "pointer" : "default",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                {date && (
                  <>
                    <div style={{ fontSize: 14, fontWeight: isToday || isSelected ? 800 : 400,
                      color: isSelected ? "#fff" : isToday ? "#e67e22" : isPast ? "#bdc3c7" : "#2c3e50",
                      width: 28, height: 28, borderRadius: "50%",
                      background: isToday && !isSelected ? "#fff3e0" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center" }}>{date.getDate()}</div>
                    <div style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
                      {dayTasks.slice(0, 3).map((t, ti) => {
                        const cc = clientColorMap[t.client] || CLIENT_COLORS[0];
                        return <div key={ti} style={{ width: 6, height: 6, borderRadius: "50%",
                          background: t.status === "done" ? "#bdc3c7" : cc.accent }} />;
                      })}
                      {dayTasks.length > 3 && <div style={{ fontSize: 8, color: isSelected ? "#aaa" : "#95a5a6" }}>+{dayTasks.length-3}</div>}
                    </div>
                    {highCount > 0 && <div style={{ width: 14, height: 3, background: "#e74c3c", borderRadius: 2 }} />}
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc" }}>
          <div style={{ padding: "12px 16px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#7f8c8d" }}>
              {selectedDate.getMonth()+1}月{selectedDate.getDate()}日（{selDayTasks.length}件）
            </span>
            <button onClick={() => openNew(selectedDate)}
              style={{ background: "#1a2740", color: "#fff", border: "none", borderRadius: 20,
                padding: "6px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>＋ 追加</button>
          </div>
          {selDayTasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#bdc3c7", fontSize: 14 }}>タスクなし</div>
          ) : (
            <div style={{ padding: "0 12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {selDayTasks.map(task => <TaskCard key={task.id} task={task} onTap={() => setSelectedTask(task)} />)}
            </div>
          )}
        </div>
      </div>
    );
  }

  function WeekView() {
    const start = getWeekStart(currentDate);
    const days = Array.from({length:7}, (_, i) => { const d = new Date(start); d.setDate(d.getDate()+i); return d; });
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", background: "#fff", borderBottom: "2px solid #f0f4f8" }}>
          {days.map((d, i) => {
            const isToday = isSameDay(d, today);
            const isSel = isSameDay(d, selectedDate);
            const cnt = tasksOnDay(d).length;
            return (
              <div key={i} onClick={() => setSelectedDate(d)}
                style={{ flex: 1, textAlign: "center", padding: "8px 2px 10px", cursor: "pointer",
                  borderBottom: isSel ? "3px solid #1a2740" : "3px solid transparent" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: i===0 ? "#e74c3c" : i===6 ? "#2980b9" : "#95a5a6" }}>{DAYS_JA[i]}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: isToday ? "#e67e22" : isSel ? "#1a2740" : "#2c3e50" }}>{d.getDate()}</div>
                {cnt > 0 && (
                  <div style={{ fontSize: 10, color: "#fff", background: isSel ? "#1a2740" : "#bdc3c7",
                    borderRadius: 10, width: 16, height: 16, margin: "2px auto 0",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>{cnt}</div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc" }}>
          <div style={{ padding: "12px 16px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#7f8c8d" }}>
              {selectedDate.getMonth()+1}月{selectedDate.getDate()}日（{tasksOnDay(selectedDate).length}件）
            </span>
            <button onClick={() => openNew(selectedDate)}
              style={{ background: "#1a2740", color: "#fff", border: "none", borderRadius: 20,
                padding: "6px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>＋ 追加</button>
          </div>
          {tasksOnDay(selectedDate).length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#bdc3c7", fontSize: 14 }}>タスクなし</div>
          ) : (
            <div style={{ padding: "0 12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {tasksOnDay(selectedDate).map(task => <TaskCard key={task.id} task={task} onTap={() => setSelectedTask(task)} />)}
            </div>
          )}
        </div>
      </div>
    );
  }

  function ListView() {
    const upcoming = filtered.filter(t => t.status !== "done").sort((a, b) => a.due.localeCompare(b.due));
    const done = filtered.filter(t => t.status === "done");
    return (
      <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc" }}>
        <div style={{ padding: "12px 16px 6px" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#7f8c8d" }}>進行中・未着手（{upcoming.length}件）</span>
        </div>
        {upcoming.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#bdc3c7", fontSize: 14 }}>タスクなし</div>
        ) : (
          <div style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            {upcoming.map(task => <TaskCard key={task.id} task={task} onTap={() => setSelectedTask(task)} showDate />)}
          </div>
        )}
        {done.length > 0 && (
          <>
            <div style={{ padding: "16px 16px 6px" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#bdc3c7" }}>完了済み（{done.length}件）</span>
            </div>
            <div style={{ padding: "0 12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {done.map(task => <TaskCard key={task.id} task={task} onTap={() => setSelectedTask(task)} showDate />)}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column",
      fontFamily: "'Hiragino Sans', 'Yu Gothic', 'Noto Sans JP', sans-serif",
      background: "#f8fafc", maxWidth: 480, margin: "0 auto", position: "relative" }}>

      {/* Header */}
      <div style={{ background: "#1a2740", color: "#fff", padding: "12px 16px 10px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 17, fontWeight: 800 }}>📋 TaskCal</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowFilter(true)}
              style={{ background: activeFilterCount > 0 ? "#e67e22" : "#2c3e50", border: "none", color: "#fff",
                borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {activeFilterCount > 0 ? `🔍 ${activeFilterCount}件` : "🔍 絞込"}
            </button>
            <button onClick={() => { setCurrentDate(today); setSelectedDate(today); }}
              style={{ background: "#e67e22", border: "none", color: "#fff",
                borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>今日</button>
          </div>
        </div>
        {view !== "list" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button onClick={prev}
              style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "#fff",
                width: 40, height: 40, borderRadius: "50%", fontSize: 22, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{headerTitle()}</span>
            <button onClick={next}
              style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "#fff",
                width: 40, height: 40, borderRadius: "50%", fontSize: 22, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {view === "month" && <MonthView />}
        {view === "week" && <WeekView />}
        {view === "list" && <ListView />}
      </div>

      {/* FAB */}
      {view === "list" && (
        <button onClick={() => openNew(selectedDate)}
          style={{ position: "absolute", bottom: 76, right: 20,
            background: "#27ae60", color: "#fff", border: "none",
            width: 56, height: 56, borderRadius: "50%", fontSize: 28, cursor: "pointer",
            boxShadow: "0 4px 16px rgba(39,174,96,0.4)", zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center" }}>＋</button>
      )}

      {/* Bottom Nav */}
      <div style={{ background: "#fff", borderTop: "1px solid #eef0f3", display: "flex", flexShrink: 0 }}>
        {[
          { key: "month", icon: "📅", label: "月" },
          { key: "week",  icon: "📆", label: "週" },
          { key: "list",  icon: "📋", label: "一覧" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setView(tab.key)}
            style={{ flex: 1, background: "none", border: "none", padding: "10px 0 8px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer" }}>
            <span style={{ fontSize: 22 }}>{tab.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: view === tab.key ? "#1a2740" : "#bdc3c7" }}>{tab.label}</span>
            {view === tab.key && <div style={{ width: 20, height: 3, background: "#1a2740", borderRadius: 2 }} />}
          </button>
        ))}
      </div>

      {/* Task Detail */}
      <BottomSheet open={!!selectedTask} onClose={() => setSelectedTask(null)} title={selectedTask?.title}>
        {selectedTask && (() => {
          const cc = clientColorMap[selectedTask.client] || CLIENT_COLORS[0];
          const isOverdue = selectedTask.status !== "done" &&
            parseDate(selectedTask.due) < today && !isSameDay(parseDate(selectedTask.due), today);
          return (
            <div style={{ padding: "16px 20px 40px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
                background: cc.bg, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ width: 6, height: 40, background: cc.accent, borderRadius: 3, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, color: cc.accent, fontWeight: 800 }}>{selectedTask.client}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#1a2740" }}>{selectedTask.title}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, color: "#95a5a6", marginBottom: 4 }}>期限日</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: isOverdue ? "#e74c3c" : "#2c3e50" }}>
                    {isOverdue && "⚠ "}{selectedTask.due}
                  </div>
                </div>
                <div style={{ background: PRIORITY_CONFIG[selectedTask.priority].bg, borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, color: "#95a5a6", marginBottom: 4 }}>優先度</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: PRIORITY_CONFIG[selectedTask.priority].color }}>
                    {PRIORITY_CONFIG[selectedTask.priority].label}
                  </div>
                </div>
                <div style={{ background: STATUS_CONFIG[selectedTask.status].bg, borderRadius: 10, padding: "10px 14px", gridColumn: "1/-1" }}>
                  <div style={{ fontSize: 11, color: "#95a5a6", marginBottom: 4 }}>ステータス</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: STATUS_CONFIG[selectedTask.status].color }}>
                    {STATUS_CONFIG[selectedTask.status].label}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => openEdit(selectedTask)}
                  style={{ flex: 1, background: "#1a2740", color: "#fff", border: "none",
                    padding: "14px", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>編集</button>
                <button onClick={() => deleteTask(selectedTask.id)}
                  style={{ flex: 1, background: "#fdecea", color: "#e74c3c", border: "none",
                    padding: "14px", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>削除</button>
              </div>
            </div>
          );
        })()}
      </BottomSheet>

      {/* Form */}
      <BottomSheet open={showForm} onClose={() => setShowForm(false)} title={editTask?.id ? "タスクを編集" : "新しいタスク"}>
        {editTask && (
          <div style={{ padding: "16px 20px 40px" }}>
            {[
              { label: "顧客名", key: "client", type: "text", placeholder: "例：株式会社○○" },
              { label: "タスク名", key: "title", type: "text", placeholder: "例：要件定義書作成" },
              { label: "期限日", key: "due", type: "date" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#7f8c8d", display: "block", marginBottom: 6 }}>{f.label}</label>
                <input type={f.type} value={editTask[f.key]} placeholder={f.placeholder}
                  onChange={e => setEditTask({...editTask, [f.key]: e.target.value})}
                  style={{ width: "100%", padding: "13px 14px", border: "2px solid #e8ecf0", borderRadius: 10,
                    fontSize: 16, outline: "none", boxSizing: "border-box", background: "#f8fafc" }} />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#7f8c8d", display: "block", marginBottom: 6 }}>優先度</label>
                <select value={editTask.priority} onChange={e => setEditTask({...editTask, priority: e.target.value})}
                  style={{ width: "100%", padding: "13px 12px", border: "2px solid #e8ecf0", borderRadius: 10, fontSize: 15, background: "#f8fafc" }}>
                  {Object.entries(PRIORITY_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#7f8c8d", display: "block", marginBottom: 6 }}>ステータス</label>
                <select value={editTask.status} onChange={e => setEditTask({...editTask, status: e.target.value})}
                  style={{ width: "100%", padding: "13px 12px", border: "2px solid #e8ecf0", borderRadius: 10, fontSize: 15, background: "#f8fafc" }}>
                  {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <button onClick={saveTask}
              style={{ width: "100%", background: "#1a2740", color: "#fff", border: "none",
                padding: "16px", borderRadius: 12, fontWeight: 800, fontSize: 16, cursor: "pointer" }}>保存する</button>
          </div>
        )}
      </BottomSheet>

      {/* Filter */}
      <BottomSheet open={showFilter} onClose={() => setShowFilter(false)} title="絞り込み">
        <div style={{ padding: "16px 20px 40px" }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#7f8c8d", marginBottom: 10 }}>顧客</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["all", ...clients].map(c => (
                <button key={c} onClick={() => setFilterClient(c)}
                  style={{ padding: "8px 16px", borderRadius: 20, border: "2px solid",
                    borderColor: filterClient === c ? "#1a2740" : "#e8ecf0",
                    background: filterClient === c ? "#1a2740" : "#fff",
                    color: filterClient === c ? "#fff" : "#2c3e50",
                    fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  {c === "all" ? "全て" : c}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#7f8c8d", marginBottom: 10 }}>ステータス</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[["all", "全て"], ...Object.entries(STATUS_CONFIG).map(([k,v]) => [k, v.label])].map(([k, label]) => (
                <button key={k} onClick={() => setFilterStatus(k)}
                  style={{ padding: "8px 16px", borderRadius: 20, border: "2px solid",
                    borderColor: filterStatus === k ? "#1a2740" : "#e8ecf0",
                    background: filterStatus === k ? "#1a2740" : "#fff",
                    color: filterStatus === k ? "#fff" : "#2c3e50",
                    fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={() => { setFilterClient("all"); setFilterStatus("all"); setShowFilter(false); }}
              style={{ width: "100%", background: "#fdecea", color: "#e74c3c", border: "none",
                padding: "13px", borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              絞り込みをリセット
            </button>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
