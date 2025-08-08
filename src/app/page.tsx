"use client";

import { useEffect, useRef, useState } from "react";
import { getPuter } from "@/lib/puter-client";
import Sidebar from "@/components/Sidebar";
import Composer from "@/components/Composer";
import {
  Msg, ThreadMeta, listThreads, writeThreadIndex, readTranscript, writeTranscript,
  summarizeTitle, loadModel, saveModel, loadLastThread, saveLastThread
} from "@/lib/threads";

type PuterUser = { uuid?: string; username?: string; email_confirmed?: boolean };

export default function Page(){
  const [threads,setThreads]=useState<ThreadMeta[]>([]);
  const [currentId,setCurrentId]=useState<string|null>(null);
  const [messages,setMessages]=useState<Msg[]>([{role:"system",content:"You are a helpful assistant."}]);
  const [input,setInput]=useState("");
  const [model,setModel]=useState("claude-3-5-sonnet");
  const [signedIn,setSignedIn]=useState(false);
  const [user,setUser]=useState<PuterUser|null>(null);
  const [busy,setBusy]=useState(false);                // <-- use state, not ref
  const endRef=useRef<HTMLDivElement>(null);

  const scrollToBottom=()=>endRef.current?.scrollIntoView({behavior:"smooth"});
  useEffect(()=>{scrollToBottom()},[messages]);

  useEffect(()=>{(async()=>{
    const p=await getPuter();
    const s=await p.auth.isSignedIn(); setSignedIn(!!s); if(s){try{setUser(await p.auth.getUser());}catch{}}
    const m=await loadModel(); if(m) setModel(m);
    const idx=await listThreads(); setThreads(idx);
    const last=await loadLastThread();
    if(last){setCurrentId(last); const hist=await readTranscript(last); if(hist.length) setMessages(hist);}
  })()},[]);

  async function handleSignIn(){const p=await getPuter(); await p.auth.signIn(); setSignedIn(true); try{setUser(await p.auth.getUser());}catch{}}
  async function handleSignOut(){const p=await getPuter(); await p.auth.signOut(); setSignedIn(false); setUser(null);}

  function newChat(){
    const id=crypto.randomUUID();
    const meta:ThreadMeta={id,title:"New chat",updatedAt:Date.now()};
    const next=[meta,...threads]; setThreads(next); setCurrentId(id);
    setMessages([{role:"system",content:"You are a helpful assistant."}]);
    writeThreadIndex(next); saveLastThread(id);
  }

  async function selectThread(id:string){
    setCurrentId(id); saveLastThread(id);
    const hist=await readTranscript(id);
    setMessages(hist.length?hist:[{role:"system",content:"You are a helpful assistant."}]);
  }

  async function send(){
    if(busy) return;
    const text=input.trim(); if(!text) return;
    const p=await getPuter();
    if(!signedIn){await p.auth.signIn(); setSignedIn(true); try{setUser(await p.auth.getUser());}catch{}}
    let id=currentId; if(!id){id=crypto.randomUUID(); setCurrentId(id);}

    setBusy(true);
    setInput("");
    const nextMsgs=[...messages,{role:"user",content:text} as Msg]; setMessages(nextMsgs);

    let acc="";
    try{
      const stream=await p.ai.chat(nextMsgs,{model,stream:true});
      setMessages(m=>[...m,{role:"assistant",content:""}]);
      for await (const part of stream){
        acc+=(part?.text??"");
        setMessages(m=>{const c=[...m]; c[c.length-1]={role:"assistant",content:acc}; return c;});
      }
    }catch(e){
      console.error(e);
    }finally{
      setBusy(false);          // <-- always clear
    }

    const full=[...nextMsgs,{role:"assistant",content:acc} as Msg];
    await writeTranscript(id!,full);

    const title=summarizeTitle(full);
    const updated:ThreadMeta={id:id!,title,updatedAt:Date.now()};
    const without=threads.filter(t=>t.id!==id);
    const idx=[updated,...without]; setThreads(idx);
    await writeThreadIndex(idx); await saveLastThread(id!);
  }

  async function onChangeModel(v:string){setModel(v); await saveModel(v);}

  return(
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      <Sidebar threads={threads} currentId={currentId} onNew={newChat} onSelect={selectThread} />

      <div className="flex-1 flex flex-col">
        <header className="border-b border-white/10">
          <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
            <h1 className="text-xl font-semibold">Puter Chat</h1>
            {!signedIn?(
              <button onClick={handleSignIn} className="rounded border border-white/20 px-3 py-1 text-sm">Sign in</button>
            ):(
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-sm">{user?.username??"Signed in"}</span>
                <button onClick={handleSignOut} className="rounded border border-white/20 px-3 py-1 text-sm">Sign out</button>
              </div>
            )}
            <select className="ml-auto border border-white/20 bg-zinc-900 rounded px-2 py-1 text-sm"
              value={model} onChange={e=>onChangeModel(e.target.value)} title="Model">
              <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
              <option value="gpt-4.1-mini">gpt-4.1-mini</option>
              <option value="gpt-4o">gpt-4o</option>
              <option value="deepseek-chat">deepseek-chat</option>
              <option value="mistral-large-latest">mistral-large-latest</option>
            </select>
            {busy && <span className="text-xs opacity-60 ml-2">…thinking</span>}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6 space-y-3">
            {messages.filter(m=>m.role!=="system").map((m,i)=>(
              <div key={i} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}>
                <div className={`max-w-[75%] px-4 py-2 rounded-2xl leading-relaxed shadow
                  ${m.role==="user"?"bg-white text-black rounded-br-md":"bg-zinc-900 text-zinc-100 rounded-bl-md"}`}>
                  <span className="sr-only">{m.role}:</span>{m.content}
                </div>
              </div>
            ))}
            <div ref={endRef}/>
          </div>
        </div>

        <Composer value={input} onChange={setInput} onSend={send} disabled={busy}/>
      </div>
    </div>
  );
}
