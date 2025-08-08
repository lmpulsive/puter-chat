import { getPuter } from "@/lib/puter-client";
export type Msg = { role: "user" | "assistant" | "system"; content: string };
export type ThreadMeta = { id: string; title: string; updatedAt: number };

const KV_THREADS = "threads:index";
const KV_LAST_MODEL = "chat:lastModel";
const KV_LAST_THREAD = "chat:lastThread";

export async function loadModel(){const p=await getPuter();try{return (await p.kv.get(KV_LAST_MODEL))??null;}catch{return null}}
export async function saveModel(m:string){const p=await getPuter();try{await p.kv.set(KV_LAST_MODEL,m);}catch{}}
export async function loadLastThread(){const p=await getPuter();try{return (await p.kv.get(KV_LAST_THREAD))??null;}catch{return null}}
export async function saveLastThread(id:string){const p=await getPuter();try{await p.kv.set(KV_LAST_THREAD,id);}catch{}}

export async function listThreads():Promise<ThreadMeta[]>{const p=await getPuter();try{const a=(await p.kv.get(KV_THREADS))??[];return Array.isArray(a)?a:[]}catch{return[]}}
export async function writeThreadIndex(i:ThreadMeta[]){const p=await getPuter();try{await p.kv.set(KV_THREADS,i);}catch{}}

export async function readTranscript(id:string):Promise<Msg[]>{const p=await getPuter();try{const f=await p.fs.read(`/threads/${id}.json`);const t=typeof f.text==="function"?await f.text():String(f);const m=JSON.parse(t);return Array.isArray(m)?m:[]}catch{return[]}}
export async function writeTranscript(id:string,messages:Msg[]){const p=await getPuter();try{await p.fs.mkdir("/threads");}catch{}try{await p.fs.write(`/threads/${id}.json`,JSON.stringify(messages));}catch{}}

export function summarizeTitle(messages:Msg[]):string{
  const u=[...messages].reverse().find(m=>m.role==="user")||messages.find(m=>m.role==="user");
  const t=(u?.content??"New chat").slice(0,40).replace(/\s+/g," ").trim();
  return t||"New chat";
}
