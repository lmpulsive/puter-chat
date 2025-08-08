"use client";
import { ThreadMeta } from "@/lib/threads";
export default function Sidebar({threads,currentId,onNew,onSelect}:{threads:ThreadMeta[];currentId:string|null;onNew:()=>void;onSelect:(id:string)=>void;}){
  return(
    <aside className="w-64 shrink-0 border-r border-zinc-800 p-3 space-y-3">
      <button onClick={onNew} className="w-full rounded bg-white/10 hover:bg-white/20 text-white px-3 py-2 text-sm">+ New Chat</button>
      <div className="text-xs uppercase opacity-60 px-1">Threads</div>
      <div className="space-y-1 max-h-[80vh] overflow-auto pr-1">
        {threads.length===0&&<div className="text-sm opacity-60 px-1 py-2">No chats yet.</div>}
        {threads.map(t=>(
          <button key={t.id} onClick={()=>onSelect(t.id)}
            className={`block w-full text-left rounded px-2 py-2 text-sm hover:bg-white/10 ${currentId===t.id?"bg-white/10 border border-white/20":""}`}
            title={new Date(t.updatedAt).toLocaleString()}>
            {t.title}
          </button>
        ))}
      </div>
    </aside>
  );
}
