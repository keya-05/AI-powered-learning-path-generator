import { Check, Copy } from "lucide-react";
import { useState } from "react";

// A join code shown large enough to read out, with a copy button.
export default function CopyCode({ code, label = "code" }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked: the code is on screen to copy by hand.
    }
  };

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-raised py-1 pl-3.5 pr-1 shadow-well">
      <span translate="no" className="font-mono text-sm font-bold tracking-[0.2em] text-slate-900 dark:text-slate-100">
        {code}
      </span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-900/5 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </span>
  );
}
