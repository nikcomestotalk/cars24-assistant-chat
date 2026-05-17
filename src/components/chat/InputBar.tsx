import { useEffect, useRef, useState } from "react";
import { Mic, Send } from "lucide-react";

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

  return (
    <div className="sticky bottom-0 border-t border-border bg-background px-3 py-2.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleMic}
          aria-label={recording ? "Stop voice input" : "Start voice input"}
          aria-pressed={recording}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
            recording ? "bg-cars24-red text-cars24-red-foreground cars24-pulse" : "bg-muted text-foreground"
          }`}
        >
          <Mic size={18} />
        </button>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask anything about cars..."
          aria-label="Message"
          className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus:border-cars24-red"
        />
        <button
          type="button"
          onClick={send}
          disabled={!text.trim() || disabled}
          aria-label="Send message"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cars24-red text-cars24-red-foreground transition-opacity disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}