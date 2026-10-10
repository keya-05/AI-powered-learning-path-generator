import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import { SampleBadge } from "../components/widgets/WidgetCard";

const INITIAL_MESSAGES = [
  {
    role: "assistant",
    text: "Hi! Ask me anything about your uploaded syllabi, notes, or PYQs — I'll ground my answers in your course material.",
  },
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", text },
      {
        role: "assistant",
        text: "This assistant isn't connected to a live model yet — once wired up, this reply will cite the specific resource and page it was grounded in.",
      },
    ]);
    setDraft("");
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-6">
      <PageHeader
        title="AI Assistant"
        description="Chat grounded in the resources uploaded to your courses."
        actions={<SampleBadge />}
      />

      <div className="card flex flex-1 flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-lg rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "rounded-br-md bg-indigo-600 text-white"
                    : "rounded-bl-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="border-t border-slate-100 p-3 dark:border-slate-800">
          <div className="relative">
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about a concept, resource, or PYQ…"
              className="input py-2.5 pr-12"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
              aria-label="Send"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
