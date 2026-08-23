import { useState } from "react";

const INITIAL_MESSAGES = [
  {
    role: "assistant",
    text: "Hi! Ask me anything about your uploaded syllabi, notes, or PYQs — I'll ground my answers in your course material.",
  },
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");

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
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">AI Assistant</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Grounded RAG chat over the resources you've uploaded.
        </p>
      </div>

      <div className="mt-4 flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-lg rounded-2xl px-4 py-2.5 text-sm ${
                  message.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="flex gap-2 border-t border-gray-200 p-3 dark:border-slate-700">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about a concept, resource, or PYQ…"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
