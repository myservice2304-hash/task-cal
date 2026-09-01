import { useState, useMemo, useRef, useEffect } from "react";

/* ===================== 定数 ===================== */
const C = {
  navy:"#1e3a5f", navyD:"#152b47", navyL:"#2d5586",
  bg:"#f5f6f8", card:"#fff", line:"#e3e6eb",
  text:"#1a1d23", muted:"#6b7280", faint:"#9ca3af",
  red:"#dc2626", orange:"#ea580c", amber:"#ca8a04", green:"#16a34a",
};

const HOLIDAYS = new Set([
  "2026-01-01","2026-01-12","2026-02-11","2026-02-23","2026-03-20",
  "2026-04-29","2026-05-03","2026-05-04","2026-05-05","2026-05-06",
  "2026-07-20","2026-08-11","2026-09-21","2026-09-22","2026-09-23","2026-10-12",
  "2026-11-03","2026-11-23","2026-12-23",
  "2027-01-01","2027-01-11","2027-02-11","2027-02-23","2027-03-21","2027-03-22",
  "2027-04-29","2027-05-03","2027-05-04","2027-05-05",
  "2027-07-19","2027-08-11","2027-09-20","2027-09-23","2027-10-11","2027-11-03","2027-11-23",
]);

const CLIENT_COLORS = [
  "#1e3a5f","#0f766e","#b45309","#9333ea","#be123c",
  "#0369a1","#15803d","#c2410c","#7c3aed","#a21caf",
];

const PRIORITY = {
  high:{label:"高",color:C.red,bg:"#fee2e2"},
  medium:{label:"中",color:C.orange,bg:"#ffedd5"},
  low:{label:"低",color:C.green,bg:"#dcfce7"},
};
const STATUS = {
  todo:{label:"未着手",color:C.muted,bg:"#f1f3f6"},
  in_progress:{label:"進行中",color:C.navyL,bg:"#e6edf7"},
  done:{label:"完了",color:C.green,bg:"#dcfce7"},
};
const BILLING = {
  unbilled:{label:"未請求",color:C.muted,bg:"#f1f3f6"},
  billed:{label:"請求済",color:C.orange,bg:"#ffedd5"},
  paid:{label:"入金済",color:C.green,bg:"#dcfce7"},
};
const REPEAT = {
  none:"繰り返さない", monthly_day:"毎月○日", weekly:"毎週○曜日", monthly_nth:"第○○曜日",
};

const DAYS_JA = ["月","火","水","木","金","土","日"];
const DOW_FULL = ["日","月","火","水","木","金","土"];

/* ===================== ユーティリティ ===================== */
const pad = n => String(n).padStart(2,"0");
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse = s => { const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); };
const sameDay = (a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
const isHoliday = d => HOLIDAYS.has(fmt(d));
const dowIdx = d => (d.getDay()+6)%7;      // 月曜=0
const isSun = d => d.getDay()===0;
const isSat = d => d.getDay()===6;
const ym = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}`;
const yen = n => "¥"+(n||0).toLocaleString("ja-JP");

function diffDays(due, today){
  return Math.round((parse(due) - new Date(today.getFullYear(),today.getMonth(),today.getDate()))/86400000);
}
function dueClass(due, today){
  const d = diffDays(due, today);
  if (d < 0) return {cls:"over", color:C.red, label:`${-d}日超過`};
  if (d === 0) return {cls:"soon", color:C.red, label:"今日"};
  if (d === 1) return {cls:"soon", color:C.orange, label:"明日"};
  if (d <= 3) return {cls:"near", color:C.amber, label:`${d}日後`};
  return {cls:"far", color:C.muted, label:`${parse(due).getMonth()+1}/${parse(due).getDate()}(${DOW_FULL[parse(due).getDay()]})`};
}

/* 繰り返しタスクの次回日付を計算 */
function nextRepeatDate(task, fromDate){
  const r = task.repeat;
  if (!r || r === "none") return null;
  const base = new Date(fromDate);
  if (r === "monthly_day") {
    const day = task.repeatDay || 1;
    let d = new Date(base.getFullYear(), base.getMonth(), day);
    if (d <= base) d = new Date(base.getFullYear(), base.getMonth()+1, day);
    return fmt(d);
  }
  if (r === "weekly") {
    const target = task.repeatDow ?? 0; // 0=月
    let d = new Date(base);
    let add = (target - dowIdx(base) + 7) % 7;
    if (add === 0) add = 7;
    d.setDate(d.getDate()+add);
    return fmt(d);
  }
  if (r === "monthly_nth") {
    const nth = task.repeatNth || 1;      // 1〜5
    const target = task.repeatDow ?? 0;   // 0=月
    const calc = (y,m) => {
      const first = new Date(y,m,1);
      let add = (target - dowIdx(first) + 7) % 7;
      const d = new Date(y,m,1+add+(nth-1)*7);
      return d.getMonth()===m ? d : null;
    };
    let d = calc(base.getFullYear(), base.getMonth());
    if (!d || d <= base) d = calc(base.getFullYear(), base.getMonth()+1);
    return d ? fmt(d) : null;
  }
  return null;
}

/* ===================== 共通UI ===================== */
function Sheet({open,onClose,title,children}){
  if(!open) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:300}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)"}}/>
      <div style={{position:"absolute",bottom:0,left:0,right:0,background:"#fff",
        borderRadius:"16px 16px 0 0",maxHeight:"92vh",display:"flex",flexDirection:"column",
        boxShadow:"0 -8px 32px rgba(0,0,0,.18)"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"10px 0 2px"}}>
          <div style={{width:36,height:4,background:"#dce1e7",borderRadius:2}}/>
        </div>
        {title&&(
          <div style={{padding:"6px 16px 12px",display:"flex",alignItems:"center",
            justifyContent:"space-between",borderBottom:`1px solid ${C.line}`}}>
            <span style={{fontSize:16,fontWeight:700,color:C.text}}>{title}</span>
            <button onClick={onClose} style={{background:"#f1f3f6",borderRadius:"50%",
              width:30,height:30,fontSize:17,color:C.muted,display:"flex",
              alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
        )}
        <div style={{overflowY:"auto",flex:1}}>{children}</div>
      </div>
    </div>
  );
}

const Card = ({children,style}) => (
  <div style={{background:C.card,border:`1px solid ${C.line}`,borderRadius:12,
    padding:14,marginBottom:10,...style}}>{children}</div>
);
const Sec = ({children,style}) => (
  <div style={{margin:"18px 0 8px",fontSize:13,fontWeight:700,color:C.muted,
    letterSpacing:".04em",...style}}>{children}</div>
);
const Empty = ({children}) => (
  <div style={{textAlign:"center",color:C.faint,padding:"26px 12px",fontSize:14}}>{children}</div>
);
const Chip = ({children,color,bg,style}) => (
  <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:600,
    padding:"2px 8px",borderRadius:99,background:bg||"#eef1f5",color:color||C.muted,
    whiteSpace:"nowrap",...style}}>{children}</span>
);
const Field = ({label,children}) => (
  <div style={{marginBottom:14}}>
    <label style={{fontSize:12,fontWeight:700,color:C.muted,display:"block",marginBottom:5}}>{label}</label>
    {children}
  </div>
);
const inputStyle = {width:"100%",padding:"12px 13px",border:`1.5px solid ${C.line}`,
  borderRadius:9,fontSize:16,outline:"none",boxSizing:"border-box",background:"#fafbfc"};
const PrimaryBtn = ({children,onClick,style}) => (
  <button onClick={onClick} style={{width:"100%",background:C.navy,color:"#fff",
    padding:15,borderRadius:11,fontWeight:700,fontSize:16,...style}}>{children}</button>
);

/* ===================== 本体 ===================== */
export default function App(){
  const today = new Date(); today.setHours(0,0,0,0);

  const load = (k,def) => { try{ return JSON.parse(localStorage.getItem(k)) ?? def; }catch{ return def; } };

  const [tab,setTab] = useState("home");
  const [cur,setCur] = useState(new Date(today));
  const [sel,setSel] = useState(new Date(today));

  const [tasks,setTasks]     = useState(()=>load("tc_tasks",[]));
  const [clients,setClients] = useState(()=>load("tc_clients",[]));
  const [bills,setBills]     = useState(()=>load("tc_bills",[]));
  const [memos,setMemos]     = useState(()=>load("tc_memos",{}));

  useEffect(()=>{localStorage.setItem("tc_tasks",JSON.stringify(tasks));},[tasks]);
  useEffect(()=>{localStorage.setItem("tc_clients",JSON.stringify(clients));},[clients]);
  useEffect(()=>{localStorage.setItem("tc_bills",JSON.stringify(bills));},[bills]);
  useEffect(()=>{localStorage.setItem("tc_memos",JSON.stringify(memos));},[memos]);

  // シート類
  const [taskForm,setTaskForm] = useState(null);
  const [taskView,setTaskView] = useState(null);
  const [clientForm,setClientForm] = useState(null);
  const [clientView,setClientView] = useState(null);
  const [billForm,setBillForm] = useState(null);
  const [memoForm,setMemoForm] = useState(null);
  const [memoClient,setMemoClient] = useState(null);

  const touchX = useRef(null);

  const clientColor = useMemo(()=>{
    const m={}; clients.forEach((c,i)=>{ m[c.name]=CLIENT_COLORS[i%CLIENT_COLORS.length]; });
    return m;
  },[clients]);
  const colorOf = name => clientColor[name] || C.navyL;

  const tasksOn = d => tasks.filter(t=>sameDay(parse(t.due),d));

  /* ---------- 今月の請求を自動生成 ---------- */
  function generateMonthlyBills(targetYm){
    const exists = new Set(bills.filter(b=>b.ym===targetYm).map(b=>b.client));
    const add = clients
      .filter(c=>c.monthlyFee>0 && !exists.has(c.name))
      .map(c=>({id:Date.now()+Math.random(), client:c.name, ym:targetYm,
        amount:Number(c.monthlyFee)||0, status:"unbilled"}));
    if(add.length) setBills(p=>[...p,...add]);
    return add.length;
  }

  /* ---------- タスク保存 ---------- */
  function saveTask(){
    const t = taskForm;
    if(!t.title || !t.due) return;
    if(t.id) setTasks(p=>p.map(x=>x.id===t.id?t:x));
    else setTasks(p=>[...p,{...t,id:Date.now()}]);
    setTaskForm(null);
  }
  function completeTask(task){
    // 繰り返しなら次回を自動生成
    const next = nextRepeatDate(task, parse(task.due));
    setTasks(p=>{
      const updated = p.map(x=>x.id===task.id?{...x,status:"done"}:x);
      if(next) updated.push({...task,id:Date.now(),due:next,status:"todo"});
      return updated;
    });
    setTaskView(null);
  }
  function delTask(id){ setTasks(p=>p.filter(x=>x.id!==id)); setTaskView(null); }

  /* ---------- 顧問先保存 ---------- */
  function saveClient(){
    const c = clientForm;
    if(!c.name) return;
    if(c.id) setClients(p=>p.map(x=>x.id===c.id?c:x));
    else setClients(p=>[...p,{...c,id:Date.now()}]);
    setClientForm(null);
  }
  function delClient(id){ setClients(p=>p.filter(x=>x.id!==id)); setClientView(null); }

  /* ---------- 集計 ---------- */
  const curYm = ym(today);
  const monthBills = bills.filter(b=>b.ym===curYm);
  const paidSum = monthBills.filter(b=>b.status==="paid").reduce((s,b)=>s+b.amount,0);
  const unpaidSum = monthBills.filter(b=>b.status!=="paid").reduce((s,b)=>s+b.amount,0);

  /* ---------- スワイプ ---------- */
  const onTS = e => touchX.current = e.touches[0].clientX;
  const onTE = e => {
    if(touchX.current===null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if(Math.abs(dx)>60){
      const d = new Date(cur);
      d.setMonth(d.getMonth() + (dx<0?1:-1));
      setCur(d);
    }
    touchX.current = null;
  };

  /* ===================== タスク行 ===================== */
  function TaskRow({t,showDate=true,onTap}){
    const col = colorOf(t.client);
    const done = t.status==="done";
    const dc = dueClass(t.due, today);
    return (
      <div onClick={onTap} style={{padding:"11px 0",borderBottom:`1px solid ${C.line}`,
        display:"flex",gap:11,alignItems:"flex-start",cursor:"pointer",opacity:done?.5:1}}>
        <div onClick={e=>{e.stopPropagation(); if(!done) completeTask(t);}}
          style={{width:21,height:21,borderRadius:"50%",flexShrink:0,marginTop:2,
            border:`2px solid ${done?C.green:"#cbd2da"}`,background:done?C.green:"transparent",
            display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12}}>
          {done&&"✓"}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:3,
            textDecoration:done?"line-through":"none"}}>
            {!done && dc.cls==="over" && <span style={{color:C.red}}>！</span>}{t.title}
          </div>
          <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap",fontSize:12}}>
            {showDate && <span style={{fontWeight:700,color:done?C.faint:dc.color}}>{dc.label}</span>}
            {t.startTime && <span style={{color:C.muted}}>{t.startTime}{t.endTime?`-${t.endTime}`:""}</span>}
            {t.client && <Chip color={col} bg={col+"14"}><span style={{width:6,height:6,
              borderRadius:99,background:col,display:"inline-block"}}/>{t.client}</Chip>}
            {t.repeat && t.repeat!=="none" && <Chip>繰り返し</Chip>}
          </div>
        </div>
        <span style={{color:"#d5dae1",fontSize:18}}>›</span>
      </div>
    );
  }

  /* ===================== ホーム ===================== */
  function Home(){
    const todayTasks = tasks.filter(t=>t.due===fmt(today)&&t.status!=="done");
    const weekEnd = new Date(today); weekEnd.setDate(today.getDate()+7);
    const weekTasks = tasks.filter(t=>{
      if(t.status==="done") return false;
      const d=parse(t.due); return d>today && d<=weekEnd;
    }).sort((a,b)=>a.due.localeCompare(b.due));
    const overdue = tasks.filter(t=>t.status!=="done" && diffDays(t.due,today)<0)
      .sort((a,b)=>a.due.localeCompare(b.due));
    const unpaid = monthBills.filter(b=>b.status!=="paid");

    return (
      <div>
        {/* 今月サマリー */}
        <Card style={{background:C.navy,border:"none",color:"#fff"}}>
          <div style={{fontSize:12,opacity:.75,marginBottom:8}}>{today.getMonth()+1}月の入金状況</div>
          <div style={{display:"flex",gap:20}}>
            <div>
              <div style={{fontSize:11,opacity:.7}}>入金済</div>
              <div style={{fontSize:21,fontWeight:800}}>{yen(paidSum)}</div>
            </div>
            <div>
              <div style={{fontSize:11,opacity:.7}}>未入金</div>
              <div style={{fontSize:21,fontWeight:800,
                color:unpaidSum>0?"#fbbf24":"#fff"}}>{yen(unpaidSum)}</div>
            </div>
          </div>
        </Card>

        {overdue.length>0&&(<>
          <Sec style={{color:C.red}}>期限超過（{overdue.length}件）</Sec>
          <Card style={{paddingTop:2,paddingBottom:2}}>
            {overdue.map(t=><TaskRow key={t.id} t={t} onTap={()=>setTaskView(t)}/>)}
          </Card>
        </>)}

        <Sec>今日 {today.getMonth()+1}/{today.getDate()}({DOW_FULL[today.getDay()]})</Sec>
        <Card style={{paddingTop:2,paddingBottom:2}}>
          {todayTasks.length===0? <Empty>予定はありません</Empty>
            : todayTasks.map(t=><TaskRow key={t.id} t={t} showDate={false} onTap={()=>setTaskView(t)}/>)}
        </Card>

        <Sec>これから1週間</Sec>
        <Card style={{paddingTop:2,paddingBottom:2}}>
          {weekTasks.length===0? <Empty>予定はありません</Empty>
            : weekTasks.map(t=><TaskRow key={t.id} t={t} onTap={()=>setTaskView(t)}/>)}
        </Card>

        {unpaid.length>0&&(<>
          <Sec>未入金の顧問先（{unpaid.length}件）</Sec>
          <Card style={{paddingTop:2,paddingBottom:2}}>
            {unpaid.map(b=>{
              const col=colorOf(b.client);
              return (
                <div key={b.id} onClick={()=>setBillForm({...b})}
                  style={{padding:"11px 0",borderBottom:`1px solid ${C.line}`,
                    display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                  <div style={{width:8,height:8,borderRadius:99,background:col,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700}}>{b.client}</div>
                    <Chip color={BILLING[b.status].color} bg={BILLING[b.status].bg}>
                      {BILLING[b.status].label}</Chip>
                  </div>
                  <div style={{fontSize:15,fontWeight:800}}>{yen(b.amount)}</div>
                </div>
              );
            })}
          </Card>
        </>)}
        <div style={{height:12}}/>
      </div>
    );
  }

  /* ===================== カレンダー ===================== */
  function Calendar(){
    const y=cur.getFullYear(), m=cur.getMonth();
    const first=dowIdx(new Date(y,m,1));
    const dim=new Date(y,m+1,0).getDate();
    const cells=[];
    for(let i=0;i<first;i++) cells.push(null);
    for(let d=1;d<=dim;d++) cells.push(new Date(y,m,d));
    const selTasks=tasksOn(sel);

    // 長押しでその日のタスクを追加
    const pressTimer = useRef(null);
    const longPressed = useRef(false);
    const startPress = d => {
      longPressed.current = false;
      clearTimeout(pressTimer.current);
      pressTimer.current = setTimeout(()=>{
        longPressed.current = true;
        setSel(d);
        setTaskForm({id:null,title:"",client:clients[0]?.name||"",due:fmt(d),
          startTime:"",endTime:"",priority:"medium",status:"todo",
          repeat:"none",repeatDay:1,repeatDow:0,repeatNth:1});
      }, 500);
    };
    const cancelPress = () => clearTimeout(pressTimer.current);

    return (
      <div>
        <Card style={{padding:"14px 10px"}}>
          {/* 月ナビ */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
            padding:"0 4px 12px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <button onClick={()=>{const d=new Date(cur);d.setMonth(m-1);setCur(d);}}
                style={{fontSize:20,color:C.muted,padding:"0 6px"}}>‹</button>
              <span style={{fontSize:17,fontWeight:700}}>{y}年 {m+1}月</span>
              <button onClick={()=>{const d=new Date(cur);d.setMonth(m+1);setCur(d);}}
                style={{fontSize:20,color:C.muted,padding:"0 6px"}}>›</button>
            </div>
            <button onClick={()=>{setCur(new Date(today));setSel(new Date(today));}}
              style={{border:`1px solid ${C.line}`,borderRadius:99,padding:"5px 14px",
                fontSize:13,fontWeight:600,color:C.navy}}>今日</button>
          </div>

          {/* 曜日 */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:4}}>
            {DAYS_JA.map((d,i)=>(
              <div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,
                color:i===5?"#2563eb":i===6?"#e11d48":C.muted}}>{d}</div>
            ))}
          </div>

          {/* 日付セル */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
            {cells.map((d,i)=>{
              if(!d) return <div key={i}/>;
              const dt=tasksOn(d).filter(t=>t.status!=="done");
              const isT=sameDay(d,today), isS=sameDay(d,sel);
              const hol=isHoliday(d), sun=isSun(d), sat=isSat(d);
              return (
                <div key={i}
                  onClick={()=>{ if(longPressed.current){ longPressed.current=false; return; } setSel(d); }}
                  onTouchStart={()=>startPress(d)} onTouchEnd={cancelPress} onTouchMove={cancelPress}
                  onMouseDown={()=>startPress(d)} onMouseUp={cancelPress} onMouseLeave={cancelPress}
                  onContextMenu={e=>e.preventDefault()}
                  style={{minHeight:56,padding:"3px 2px",borderRadius:6,cursor:"pointer",
                    userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none",
                    border:isS?`2px solid ${C.navy}`:isT?`1px solid ${C.navy}`:"1px solid transparent",
                    background:isT?"#f0f4fa":"transparent",
                    display:"flex",flexDirection:"column",gap:2}}>
                  <div style={{fontSize:11,fontWeight:isT?800:600,textAlign:"center",
                    color:isT?C.navy:(hol||sun)?"#e11d48":sat?"#2563eb":C.text}}>{d.getDate()}</div>
                  {dt.slice(0,3).map((t,k)=>{
                    const col=colorOf(t.client);
                    return (
                      <div key={k} style={{background:col,color:"#fff",fontSize:8,
                        fontWeight:600,padding:"1px 3px",borderRadius:3,overflow:"hidden",
                        textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.5}}>
                        {t.title}
                      </div>
                    );
                  })}
                  {dt.length>3&&<div style={{fontSize:8,color:C.faint,textAlign:"center",
                    fontWeight:700}}>+{dt.length-3}</div>}
                </div>
              );
            })}
          </div>
          <div style={{textAlign:"center",fontSize:11,color:C.faint,marginTop:10}}>
            左右にスワイプで月を移動 ／ 日付を長押しで予定を追加
          </div>
        </Card>

        <Sec>{sel.getMonth()+1}/{sel.getDate()}({DOW_FULL[sel.getDay()]}) の予定
          {isHoliday(sel)&&" 🎌"}</Sec>
        <Card style={{paddingTop:2,paddingBottom:2}}>
          {selTasks.length===0? <Empty>予定はありません</Empty>
            : selTasks.map(t=><TaskRow key={t.id} t={t} showDate={false} onTap={()=>setTaskView(t)}/>)}
        </Card>
        <div style={{height:12}}/>
      </div>
    );
  }

  /* ===================== タスク一覧 ===================== */
  function TaskList(){
    const [mode,setMode]=useState("undone");
    const list = mode==="undone" ? tasks.filter(t=>t.status!=="done").sort((a,b)=>a.due.localeCompare(b.due))
      : mode==="done" ? tasks.filter(t=>t.status==="done").sort((a,b)=>b.due.localeCompare(a.due))
      : null;

    return (
      <div>
        <div style={{display:"flex",gap:7,marginBottom:12,flexWrap:"wrap"}}>
          {[["undone","未完了"],["done","完了済み"],["client","顧問先別"]].map(([k,l])=>(
            <button key={k} onClick={()=>setMode(k)}
              style={{padding:"7px 16px",borderRadius:99,fontSize:13,fontWeight:600,
                border:`1px solid ${mode===k?C.navy:C.line}`,
                background:mode===k?C.navy:"#fff",color:mode===k?"#fff":C.text}}>{l}</button>
          ))}
        </div>

        {mode!=="client" ? (
          <Card style={{paddingTop:2,paddingBottom:2}}>
            {list.length===0? <Empty>タスクはありません</Empty>
              : list.map(t=><TaskRow key={t.id} t={t} onTap={()=>setTaskView(t)}/>)}
          </Card>
        ) : (
          clients.length===0 ? <Empty>顧問先が登録されていません</Empty> :
          clients.map(c=>{
            const ct=tasks.filter(t=>t.client===c.name&&t.status!=="done")
              .sort((a,b)=>a.due.localeCompare(b.due));
            const col=colorOf(c.name);
            return (
              <Card key={c.id} style={{padding:"12px 14px 2px"}}>
                <div style={{display:"flex",alignItems:"center",gap:9,paddingBottom:8}}>
                  <div style={{width:9,height:9,borderRadius:99,background:col}}/>
                  <span style={{fontSize:15,fontWeight:700,flex:1}}>{c.name}</span>
                  <Chip color={col} bg={col+"14"}>{ct.length}件</Chip>
                </div>
                {ct.length===0
                  ? <div style={{padding:"4px 0 12px",fontSize:13,color:C.faint}}>未完了のタスクなし</div>
                  : ct.map(t=><TaskRow key={t.id} t={t} onTap={()=>setTaskView(t)}/>)}
              </Card>
            );
          })
        )}
        <div style={{height:12}}/>
      </div>
    );
  }

  /* ===================== 売上 ===================== */
  function Sales(){
    const [viewYm,setViewYm]=useState(curYm);
    const list=bills.filter(b=>b.ym===viewYm)
      .sort((a,b)=>a.client.localeCompare(b.client,"ja"));
    const paid=list.filter(b=>b.status==="paid").reduce((s,b)=>s+b.amount,0);
    const unpaid=list.filter(b=>b.status!=="paid").reduce((s,b)=>s+b.amount,0);
    const [y,mo]=viewYm.split("-").map(Number);

    const shift = n => {
      const d=new Date(y,mo-1+n,1); setViewYm(ym(d));
    };

    return (
      <div>
        <Card style={{background:C.navy,border:"none",color:"#fff"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <button onClick={()=>shift(-1)} style={{color:"#fff",fontSize:19,opacity:.8}}>‹</button>
            <span style={{fontSize:15,fontWeight:700}}>{y}年{mo}月</span>
            <button onClick={()=>shift(1)} style={{color:"#fff",fontSize:19,opacity:.8}}>›</button>
          </div>
          <div style={{display:"flex",gap:22}}>
            <div>
              <div style={{fontSize:11,opacity:.7}}>入金済</div>
              <div style={{fontSize:22,fontWeight:800}}>{yen(paid)}</div>
            </div>
            <div>
              <div style={{fontSize:11,opacity:.7}}>未入金</div>
              <div style={{fontSize:22,fontWeight:800,color:unpaid>0?"#fbbf24":"#fff"}}>{yen(unpaid)}</div>
            </div>
          </div>
          <div style={{fontSize:11,opacity:.65,marginTop:10,
            borderTop:"1px solid rgba(255,255,255,.15)",paddingTop:8}}>
            合計 {yen(paid+unpaid)}（{list.length}件）
          </div>
        </Card>

        <button onClick={()=>{
          const n=generateMonthlyBills(viewYm);
          if(n===0) alert("追加できる請求はありません。\n（顧問先に月額を登録するか、すでに全件作成済みです）");
        }} style={{width:"100%",border:`1px dashed ${C.navy}`,borderRadius:10,
          padding:"12px",fontSize:14,fontWeight:600,color:C.navy,marginBottom:14}}>
          ＋ {mo}月分の顧問料を一括作成
        </button>

        {list.length===0? <Empty>この月の請求はありません</Empty> :
          <Card style={{paddingTop:2,paddingBottom:2}}>
            {list.map(b=>{
              const col=colorOf(b.client), st=BILLING[b.status];
              return (
                <div key={b.id} onClick={()=>setBillForm({...b})}
                  style={{padding:"12px 0",borderBottom:`1px solid ${C.line}`,
                    display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                  <div style={{width:8,height:8,borderRadius:99,background:col,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,marginBottom:3}}>{b.client}</div>
                    <Chip color={st.color} bg={st.bg}>{st.label}</Chip>
                  </div>
                  <div style={{fontSize:15,fontWeight:800}}>{yen(b.amount)}</div>
                  <span style={{color:"#d5dae1",fontSize:17}}>›</span>
                </div>
              );
            })}
          </Card>
        }
        <div style={{height:12}}/>
      </div>
    );
  }

  /* ===================== 顧問先 ===================== */
  function Clients(){
    return (
      <div>
        {clients.length===0? <Empty>顧問先が登録されていません<br/>右下の＋から追加できます</Empty> :
          clients.map(c=>{
            const col=colorOf(c.name);
            const active=tasks.filter(t=>t.client===c.name&&t.status!=="done").length;
            const memoCount=(memos[c.name]||[]).length;
            return (
              <Card key={c.id} style={{padding:"13px 14px"}}>
                <div onClick={()=>setClientView(c)} style={{cursor:"pointer"}}>
                  <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:7}}>
                    <div style={{width:10,height:10,borderRadius:99,background:col}}/>
                    <span style={{fontSize:16,fontWeight:700,flex:1}}>{c.name}</span>
                    <span style={{color:"#d5dae1",fontSize:18}}>›</span>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {c.monthlyFee>0&&<Chip color={C.navy} bg="#e6edf7">月額 {yen(c.monthlyFee)}</Chip>}
                    <Chip>タスク {active}件</Chip>
                    {memoCount>0&&<Chip>メモ {memoCount}件</Chip>}
                  </div>
                </div>
              </Card>
            );
          })
        }
        <div style={{height:12}}/>
      </div>
    );
  }

  /* ===================== FAB の動作 ===================== */
  function fabAction(){
    if(tab==="clients") setClientForm({id:null,name:"",person:"",tel:"",email:"",
      address:"",startDate:"",monthlyFee:"",note:""});
    else setTaskForm({id:null,title:"",client:clients[0]?.name||"",due:fmt(sel),
      startTime:"",endTime:"",priority:"medium",status:"todo",
      repeat:"none",repeatDay:1,repeatDow:0,repeatNth:1});
  }

  const titles={home:"ホーム",calendar:"カレンダー",tasks:"タスク",sales:"売上",clients:"顧問先"};

  /* ===================== 描画 ===================== */
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,
      fontFamily:"-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif",
      fontSize:15,lineHeight:1.6,display:"flex",flexDirection:"column"}}>

      {/* ヘッダー */}
      <div style={{position:"sticky",top:0,zIndex:40,background:C.navy,color:"#fff",
        padding:"14px 16px 12px"}}>
        <div style={{fontSize:17,fontWeight:600}}>{titles[tab]}</div>
        <div style={{fontSize:12,opacity:.75}}>TaskCal</div>
      </div>

      {/* 本体 */}
      <div style={{flex:1,padding:"12px 12px 84px"}} onTouchStart={onTS} onTouchEnd={onTE}>
        {tab==="home"&&<Home/>}
        {tab==="calendar"&&<Calendar/>}
        {tab==="tasks"&&<TaskList/>}
        {tab==="sales"&&<Sales/>}
        {tab==="clients"&&<Clients/>}
      </div>

      {/* FAB */}
      {tab!=="sales"&&(
        <button onClick={fabAction} style={{position:"fixed",right:18,bottom:80,
          width:54,height:54,borderRadius:"50%",background:C.navy,color:"#fff",
          fontSize:26,boxShadow:"0 4px 14px rgba(30,58,95,.4)",zIndex:45,
          display:"flex",alignItems:"center",justifyContent:"center"}}>＋</button>
      )}

      {/* ボトムナビ */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:50,background:"#fff",
        borderTop:`1px solid ${C.line}`,display:"grid",gridTemplateColumns:"repeat(5,1fr)"}}>
        {[["home","ホーム","⌂"],["calendar","カレンダー","▦"],["tasks","タスク","☰"],
          ["sales","売上","¥"],["clients","顧問先","◎"]].map(([k,l,ic])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{padding:"9px 2px 8px",display:"flex",flexDirection:"column",
              alignItems:"center",gap:3,fontSize:10,fontWeight:500,
              color:tab===k?C.navy:C.faint}}>
            <span style={{fontSize:19,lineHeight:1}}>{ic}</span>{l}
          </button>
        ))}
      </div>

      {/* ---------- タスク詳細 ---------- */}
      <Sheet open={!!taskView} onClose={()=>setTaskView(null)} title="タスクの詳細">
        {taskView&&(()=>{
          const col=colorOf(taskView.client), dc=dueClass(taskView.due,today);
          return (
            <div style={{padding:"14px 16px 34px"}}>
              <div style={{fontSize:19,fontWeight:800,marginBottom:12}}>{taskView.title}</div>
              <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:16}}>
                {taskView.client&&<Chip color={col} bg={col+"14"}>{taskView.client}</Chip>}
                <Chip color={PRIORITY[taskView.priority].color} bg={PRIORITY[taskView.priority].bg}>
                  優先度 {PRIORITY[taskView.priority].label}</Chip>
                <Chip color={STATUS[taskView.status].color} bg={STATUS[taskView.status].bg}>
                  {STATUS[taskView.status].label}</Chip>
                {taskView.repeat!=="none"&&<Chip>{REPEAT[taskView.repeat]}</Chip>}
              </div>
              <div style={{background:"#fafbfc",border:`1px solid ${C.line}`,borderRadius:10,
                padding:"12px 14px",marginBottom:18}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:13,color:C.muted}}>期限</span>
                  <span style={{fontSize:14,fontWeight:700,color:dc.color}}>
                    {taskView.due}（{dc.label}）</span>
                </div>
                {taskView.startTime&&(
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:13,color:C.muted}}>時間</span>
                    <span style={{fontSize:14,fontWeight:700}}>
                      {taskView.startTime}{taskView.endTime?` 〜 ${taskView.endTime}`:""}</span>
                  </div>
                )}
              </div>
              {taskView.status!=="done"&&(
                <PrimaryBtn onClick={()=>completeTask(taskView)}
                  style={{background:C.green,marginBottom:10}}>完了にする</PrimaryBtn>
              )}
              <div style={{display:"flex",gap:9}}>
                <button onClick={()=>{setTaskForm({...taskView});setTaskView(null);}}
                  style={{flex:1,background:C.navy,color:"#fff",padding:14,borderRadius:11,
                    fontWeight:700,fontSize:15}}>編集</button>
                <button onClick={()=>delTask(taskView.id)}
                  style={{flex:1,background:"#fee2e2",color:C.red,padding:14,borderRadius:11,
                    fontWeight:700,fontSize:15}}>削除</button>
              </div>
            </div>
          );
        })()}
      </Sheet>

      {/* ---------- タスク編集 ---------- */}
      <Sheet open={!!taskForm} onClose={()=>setTaskForm(null)}
        title={taskForm?.id?"タスクを編集":"新しいタスク"}>
        {taskForm&&(
          <div style={{padding:"14px 16px 34px"}}>
            <Field label="タスク名">
              <input value={taskForm.title} placeholder="例：月次報告書の作成"
                onChange={e=>setTaskForm({...taskForm,title:e.target.value})} style={inputStyle}/>
            </Field>
            <Field label="顧問先">
              <select value={taskForm.client}
                onChange={e=>setTaskForm({...taskForm,client:e.target.value})} style={inputStyle}>
                <option value="">（未設定）</option>
                {clients.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="期限日">
              <input type="date" value={taskForm.due}
                onChange={e=>setTaskForm({...taskForm,due:e.target.value})} style={inputStyle}/>
            </Field>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Field label="開始時刻（任意）">
                <input type="time" value={taskForm.startTime}
                  onChange={e=>setTaskForm({...taskForm,startTime:e.target.value})} style={inputStyle}/>
              </Field>
              <Field label="終了時刻（任意）">
                <input type="time" value={taskForm.endTime}
                  onChange={e=>setTaskForm({...taskForm,endTime:e.target.value})} style={inputStyle}/>
              </Field>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Field label="優先度">
                <select value={taskForm.priority}
                  onChange={e=>setTaskForm({...taskForm,priority:e.target.value})} style={inputStyle}>
                  {Object.entries(PRIORITY).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="ステータス">
                <select value={taskForm.status}
                  onChange={e=>setTaskForm({...taskForm,status:e.target.value})} style={inputStyle}>
                  {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
            </div>

            {/* 繰り返し */}
            <Field label="繰り返し">
              <select value={taskForm.repeat}
                onChange={e=>setTaskForm({...taskForm,repeat:e.target.value})} style={inputStyle}>
                {Object.entries(REPEAT).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            {taskForm.repeat==="monthly_day"&&(
              <Field label="毎月何日">
                <select value={taskForm.repeatDay}
                  onChange={e=>setTaskForm({...taskForm,repeatDay:Number(e.target.value)})} style={inputStyle}>
                  {Array.from({length:31},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}日</option>)}
                </select>
              </Field>
            )}
            {taskForm.repeat==="weekly"&&(
              <Field label="毎週何曜日">
                <select value={taskForm.repeatDow}
                  onChange={e=>setTaskForm({...taskForm,repeatDow:Number(e.target.value)})} style={inputStyle}>
                  {DAYS_JA.map((d,i)=><option key={i} value={i}>{d}曜日</option>)}
                </select>
              </Field>
            )}
            {taskForm.repeat==="monthly_nth"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Field label="第何週">
                  <select value={taskForm.repeatNth}
                    onChange={e=>setTaskForm({...taskForm,repeatNth:Number(e.target.value)})} style={inputStyle}>
                    {[1,2,3,4,5].map(n=><option key={n} value={n}>第{n}</option>)}
                  </select>
                </Field>
                <Field label="曜日">
                  <select value={taskForm.repeatDow}
                    onChange={e=>setTaskForm({...taskForm,repeatDow:Number(e.target.value)})} style={inputStyle}>
                    {DAYS_JA.map((d,i)=><option key={i} value={i}>{d}曜日</option>)}
                  </select>
                </Field>
              </div>
            )}
            {taskForm.repeat!=="none"&&(
              <div style={{fontSize:12,color:C.muted,background:"#f0f4fa",borderRadius:8,
                padding:"10px 12px",marginBottom:16}}>
                完了にすると、次回分のタスクが自動で作成されます。
              </div>
            )}
            <PrimaryBtn onClick={saveTask}>保存する</PrimaryBtn>
          </div>
        )}
      </Sheet>

      {/* ---------- 顧問先詳細 ---------- */}
      <Sheet open={!!clientView} onClose={()=>setClientView(null)} title="顧問先の詳細">
        {clientView&&(()=>{
          const col=colorOf(clientView.name);
          const list=memos[clientView.name]||[];
          const rows=[["担当者",clientView.person],["電話",clientView.tel],
            ["メール",clientView.email],["住所",clientView.address],
            ["契約開始",clientView.startDate],
            ["月額顧問料",clientView.monthlyFee?yen(clientView.monthlyFee):""]];
          return (
            <div style={{padding:"14px 16px 34px"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                <div style={{width:12,height:12,borderRadius:99,background:col}}/>
                <span style={{fontSize:19,fontWeight:800}}>{clientView.name}</span>
              </div>

              <div style={{background:"#fafbfc",border:`1px solid ${C.line}`,borderRadius:10,
                padding:"6px 14px",marginBottom:16}}>
                {rows.map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",
                    padding:"9px 0",borderBottom:`1px solid ${C.line}`,gap:12}}>
                    <span style={{fontSize:13,color:C.muted,flexShrink:0}}>{k}</span>
                    <span style={{fontSize:14,fontWeight:600,textAlign:"right",
                      color:v?C.text:C.faint,wordBreak:"break-all"}}>{v||"—"}</span>
                  </div>
                ))}
              </div>

              {clientView.note&&(
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:5}}>契約内容メモ</div>
                  <div style={{background:"#fafbfc",border:`1px solid ${C.line}`,borderRadius:10,
                    padding:"12px 14px",fontSize:14,whiteSpace:"pre-wrap",lineHeight:1.7}}>
                    {clientView.note}</div>
                </div>
              )}

              {/* メモ */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                marginBottom:8}}>
                <span style={{fontSize:13,fontWeight:700,color:C.muted}}>業務メモ（{list.length}件）</span>
                <button onClick={()=>{setMemoClient(clientView.name);
                  setMemoForm({id:null,title:"",body:""});}}
                  style={{fontSize:12,fontWeight:700,color:C.navy,
                    border:`1px solid ${C.line}`,borderRadius:99,padding:"5px 12px"}}>＋ 追加</button>
              </div>
              {list.length===0? <div style={{fontSize:13,color:C.faint,padding:"8px 0 16px"}}>
                メモはまだありません</div> :
                <div style={{marginBottom:16}}>
                  {list.map(mm=>(
                    <div key={mm.id} style={{background:"#fff",border:`1px solid ${C.line}`,
                      borderRadius:10,padding:"11px 13px",marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:14,fontWeight:700}}>{mm.title||"（無題）"}</div>
                          <div style={{fontSize:11,color:C.faint}}>{mm.createdAt}</div>
                        </div>
                        <div style={{display:"flex",gap:6,flexShrink:0}}>
                          <button onClick={()=>{setMemoClient(clientView.name);setMemoForm({...mm});}}
                            style={{fontSize:11,fontWeight:700,color:C.navy,background:"#eef1f5",
                              borderRadius:7,padding:"4px 9px"}}>編集</button>
                          <button onClick={()=>setMemos(p=>({...p,
                            [clientView.name]:(p[clientView.name]||[]).filter(x=>x.id!==mm.id)}))}
                            style={{fontSize:11,fontWeight:700,color:C.red,background:"#fee2e2",
                              borderRadius:7,padding:"4px 9px"}}>削除</button>
                        </div>
                      </div>
                      {mm.body&&<div style={{fontSize:13,marginTop:8,whiteSpace:"pre-wrap",
                        lineHeight:1.7,color:C.text}}>{mm.body}</div>}
                    </div>
                  ))}
                </div>
              }

              <div style={{display:"flex",gap:9}}>
                <button onClick={()=>{setClientForm({...clientView});setClientView(null);}}
                  style={{flex:1,background:C.navy,color:"#fff",padding:14,borderRadius:11,
                    fontWeight:700,fontSize:15}}>編集</button>
                <button onClick={()=>delClient(clientView.id)}
                  style={{flex:1,background:"#fee2e2",color:C.red,padding:14,borderRadius:11,
                    fontWeight:700,fontSize:15}}>削除</button>
              </div>
            </div>
          );
        })()}
      </Sheet>

      {/* ---------- 顧問先編集 ---------- */}
      <Sheet open={!!clientForm} onClose={()=>setClientForm(null)}
        title={clientForm?.id?"顧問先を編集":"顧問先を追加"}>
        {clientForm&&(
          <div style={{padding:"14px 16px 34px"}}>
            <Field label="顧問先名（必須）">
              <input value={clientForm.name} placeholder="例：株式会社○○"
                onChange={e=>setClientForm({...clientForm,name:e.target.value})} style={inputStyle}/>
            </Field>
            <Field label="月額顧問料（任意）">
              <input type="number" inputMode="numeric" value={clientForm.monthlyFee}
                placeholder="例：50000"
                onChange={e=>setClientForm({...clientForm,monthlyFee:e.target.value})} style={inputStyle}/>
            </Field>
            <Field label="担当者名（任意）">
              <input value={clientForm.person}
                onChange={e=>setClientForm({...clientForm,person:e.target.value})} style={inputStyle}/>
            </Field>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Field label="電話番号（任意）">
                <input type="tel" value={clientForm.tel}
                  onChange={e=>setClientForm({...clientForm,tel:e.target.value})} style={inputStyle}/>
              </Field>
              <Field label="契約開始日（任意）">
                <input type="date" value={clientForm.startDate}
                  onChange={e=>setClientForm({...clientForm,startDate:e.target.value})} style={inputStyle}/>
              </Field>
            </div>
            <Field label="メールアドレス（任意）">
              <input type="email" value={clientForm.email}
                onChange={e=>setClientForm({...clientForm,email:e.target.value})} style={inputStyle}/>
            </Field>
            <Field label="住所・訪問先（任意）">
              <input value={clientForm.address}
                onChange={e=>setClientForm({...clientForm,address:e.target.value})} style={inputStyle}/>
            </Field>
            <Field label="契約内容メモ（任意）">
              <textarea rows={4} value={clientForm.note}
                onChange={e=>setClientForm({...clientForm,note:e.target.value})}
                style={{...inputStyle,fontSize:15,resize:"vertical",lineHeight:1.7}}/>
            </Field>
            <PrimaryBtn onClick={saveClient}>保存する</PrimaryBtn>
          </div>
        )}
      </Sheet>

      {/* ---------- 請求ステータス編集 ---------- */}
      <Sheet open={!!billForm} onClose={()=>setBillForm(null)} title="請求の編集">
        {billForm&&(
          <div style={{padding:"14px 16px 34px"}}>
            <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>{billForm.client}</div>
            <div style={{fontSize:13,color:C.muted,marginBottom:18}}>
              {billForm.ym.replace("-","年")}月分</div>
            <Field label="金額">
              <input type="number" inputMode="numeric" value={billForm.amount}
                onChange={e=>setBillForm({...billForm,amount:Number(e.target.value)||0})}
                style={inputStyle}/>
            </Field>
            <Field label="ステータス">
              <div style={{display:"flex",gap:7}}>
                {Object.entries(BILLING).map(([k,v])=>(
                  <button key={k} onClick={()=>setBillForm({...billForm,status:k})}
                    style={{flex:1,padding:"11px 4px",borderRadius:9,fontSize:13,fontWeight:700,
                      border:`1.5px solid ${billForm.status===k?C.navy:C.line}`,
                      background:billForm.status===k?C.navy:"#fff",
                      color:billForm.status===k?"#fff":C.text}}>{v.label}</button>
                ))}
              </div>
            </Field>
            <PrimaryBtn onClick={()=>{
              setBills(p=>p.map(b=>b.id===billForm.id?billForm:b)); setBillForm(null);
            }} style={{marginBottom:10}}>保存する</PrimaryBtn>
            <button onClick={()=>{setBills(p=>p.filter(b=>b.id!==billForm.id));setBillForm(null);}}
              style={{width:"100%",background:"#fee2e2",color:C.red,padding:13,
                borderRadius:11,fontWeight:700,fontSize:15}}>この請求を削除</button>
          </div>
        )}
      </Sheet>

      {/* ---------- メモ編集 ---------- */}
      <Sheet open={!!memoForm} onClose={()=>setMemoForm(null)}
        title={memoForm?.id?"メモを編集":"新しいメモ"}>
        {memoForm&&(
          <div style={{padding:"14px 16px 34px"}}>
            <Field label="タイトル">
              <input value={memoForm.title} placeholder="例：10月訪問時の申し送り"
                onChange={e=>setMemoForm({...memoForm,title:e.target.value})} style={inputStyle}/>
            </Field>
            <Field label="内容">
              <textarea rows={8} value={memoForm.body}
                onChange={e=>setMemoForm({...memoForm,body:e.target.value})}
                style={{...inputStyle,fontSize:15,resize:"vertical",lineHeight:1.7}}/>
            </Field>
            <PrimaryBtn onClick={()=>{
              if(!memoForm.title&&!memoForm.body) return;
              const list=memos[memoClient]||[];
              if(memoForm.id){
                setMemos(p=>({...p,[memoClient]:list.map(x=>x.id===memoForm.id?memoForm:x)}));
              }else{
                setMemos(p=>({...p,[memoClient]:[{...memoForm,id:Date.now(),
                  createdAt:new Date().toLocaleDateString("ja-JP")},...list]}));
              }
              setMemoForm(null);
            }}>保存する</PrimaryBtn>
          </div>
        )}
      </Sheet>
    </div>
  );
}
