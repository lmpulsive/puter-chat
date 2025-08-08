"use client";
import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
};

export default function Composer({ value, onChange, onSend, disabled }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  // auto-grow textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = ta.scrollHeight + "px";
  }, [value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled) onSend();
    }
  }

  return (
    <div className="sticky bottom-0 border-t border-white/10 bg-zinc-950/70 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/50">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="rounded-full bg-zinc-900/80 ring-1 ring-white/10 shadow-lg px-3 py-2 flex items-end gap-2">
          {/* Left action (attach) */}
          <button
            type="button"
            className="shrink-0 rounded-full p-2 hover:bg-white/10"
            title="Attach"
            // onClick={() => ... add later }
          >
            {/* plus icon */}
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
          </button>

          {/* Textarea */}
          <textarea
            ref={taRef}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Say something…"
            className="flex-1 resize-none bg-transparent outline-none text-base placeholder:text-zinc-500 max-h-40 py-1"
          />

          {/* Voice (placeholder) */}
          <button
            type="button"
            className="shrink-0 rounded-full p-2 hover:bg-white/10"
            title="Voice (soon)"
            disabled
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" d="M12 3a3 3 0 0 1 3 3v6a3 3 0 1 1-6 0V6a3 3 0 0 1 3-3z" />
              <path strokeWidth="2" strokeLinecap="round" d="M19 10v1a7 7 0 0 1-14 0v-1M12 21v-3" />
            </svg>
          </button>

          {/* Send */}
          <button
            type="button"
            onClick={onSend}
            disabled={disabled}
            className="shrink-0 rounded-full px-4 py-2 bg-white text-black font-medium disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <div className="mt-1 text-[11px] text-zinc-500 px-3">
          Press <span className="border border-white/20 px-1 rounded">Enter</span> to send • <span className="border border-white/20 px-1 rounded">Shift</span> + Enter for newline
        </div>
      </div>
    </div>
  );
}
