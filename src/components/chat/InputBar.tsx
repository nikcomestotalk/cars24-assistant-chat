import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Paperclip } from "lucide-react";

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
    <div className="border-t border-border bg-background px-4 pb-5 pt-3">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col rounded-2xl border border-border bg-background shadow-sm transition-shadow focus-within:shadow-md focus-within:border-foreground/20">
          <textarea
            ref={taRef}
            rows={1}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 180) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask anything about cars..."
            aria-label="Message"
            className="max-h-[180px] w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] leading-6 text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between px-3 pb-2.5">
            <button
              type="button"
              aria-label="Attach file"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Paperclip size={16} />
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMic}
                aria-label={recording ? "Stop voice input" : "Start voice input"}
                aria-pressed={recording}
                className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${
                  recording
                    ? "bg-cars24-red text-cars24-red-foreground cars24-pulse"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Mic size={16} />
              </button>
              <button
                type="button"
                onClick={send}
                disabled={!hasText || disabled}
                aria-label="Send message"
                className="grid h-8 w-8 place-items-center rounded-lg bg-cars24-red text-cars24-red-foreground transition-opacity disabled:opacity-30 hover:opacity-90"
              >
                <ArrowUp size={16} />
              </button>
            </div>
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          AI responses are for guidance only · Verify details on Cars24 before purchase
        </p>
      </div>
    </div>
  );
}
