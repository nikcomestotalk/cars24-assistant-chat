import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Plus } from "lucide-react";

export function InputBar({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const recRef = useRef<any>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop?.();
      } catch {}
    };
  }, []);

  const send = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
    if (taRef.current) taRef.current.style.height = "auto";
  };

  const toggleMic = () => {
    if (typeof window === "undefined") return;
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input isn't supported in this browser.");
      return;
    }
    if (recording) {
      recRef.current?.stop?.();
      setRecording(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let transcript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setText(transcript);
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recRef.current = rec;
    rec.start();
    setRecording(true);
  };

  const hasText = text.trim().length > 0;

  return (
    <div className="sticky bottom-0 bg-background px-3 pb-3 pt-2">
      <div className="flex flex-col rounded-3xl border border-border bg-muted/40 px-2 py-2 shadow-sm focus-within:border-foreground/30">
        <textarea
          ref={taRef}
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 160) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask anything about cars..."
          aria-label="Message"
          className="max-h-40 w-full resize-none bg-transparent px-2 py-1.5 text-[15px] leading-6 text-foreground outline-none placeholder:text-muted-foreground"
        />
        <div className="mt-1 flex items-center justify-between">
          <button
            type="button"
            aria-label="Add attachment"
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <Plus size={18} />
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleMic}
              aria-label={recording ? "Stop voice input" : "Start voice input"}
              aria-pressed={recording}
              className={`grid h-9 w-9 place-items-center rounded-full transition-colors ${
                recording
                  ? "bg-cars24-red text-cars24-red-foreground cars24-pulse"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Mic size={18} />
            </button>
            <button
              type="button"
              onClick={send}
              disabled={!hasText || disabled}
              aria-label="Send message"
              className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30"
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}