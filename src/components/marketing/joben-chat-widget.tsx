"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, Send, X } from "lucide-react";
import { JOBEN_SUGGESTED_PROMPTS } from "@/lib/joben/public-knowledge";
import { askJobenAction } from "@/server/actions/joben-chat";
import styles from "./joben-chat-widget.module.css";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const INITIAL_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hi — I'm Joben. How can I help?",
};

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function renderAssistantContent(content: string) {
  const parts = content.split(/(\/(?:products|signup|contact|dashboard\/career-advisory))/g);

  return parts.map((part, index) => {
    if (part === "/products") {
      return (
        <Link key={`link-${index}`} href="/products" className={styles.inlineLink}>
          products page
        </Link>
      );
    }
    if (part === "/signup") {
      return (
        <Link key={`link-${index}`} href="/signup" className={styles.inlineLink}>
          sign up
        </Link>
      );
    }
    if (part === "/contact") {
      return (
        <Link key={`link-${index}`} href="/contact" className={styles.inlineLink}>
          Contact us
        </Link>
      );
    }
    if (part === "/dashboard/career-advisory") {
      return (
        <Link
          key={`link-${index}`}
          href="/dashboard/career-advisory"
          className={styles.inlineLink}
        >
          Career Advisory
        </Link>
      );
    }
    return part;
  });
}

export function JobenChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) {
      return;
    }

    node.scrollTop = node.scrollHeight;
  }, [messages, open, pending]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setPending(true);

    const history = messages
      .filter((entry) => entry.id !== "welcome")
      .slice(-10)
      .map((entry) => ({
        role: entry.role,
        content: entry.content,
      }));

    const result = await askJobenAction(trimmed, history);

    setMessages((current) => [
      ...current,
      {
        id: createId(),
        role: "assistant",
        content: "error" in result ? result.error : result.content,
      },
    ]);
    setPending(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <div className={styles.root} aria-live="polite">
      {open ? (
        <section
          id="joben-chat-panel"
          className={styles.panel}
          role="dialog"
          aria-modal="false"
          aria-label="Joben chat"
        >
          <header className={styles.header}>
            <div className={styles.headerIdentity}>
              <span className={styles.avatar} aria-hidden>
                J
              </span>
              <div>
                <p className={styles.headerName}>Joben</p>
              </div>
            </div>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setOpen(false)}
              aria-label="Close Joben chat"
            >
              <X size={18} aria-hidden />
            </button>
          </header>

          <div className={styles.messages} ref={listRef}>
            {messages.map((message) => (
              <article
                key={message.id}
                className={
                  message.role === "assistant"
                    ? styles.messageAssistant
                    : styles.messageUser
                }
              >
                {message.role === "assistant" ? (
                  <span className={styles.messageAvatar} aria-hidden>
                    J
                  </span>
                ) : null}
                <p className={styles.messageText}>
                  {message.role === "assistant"
                    ? renderAssistantContent(message.content)
                    : message.content}
                </p>
              </article>
            ))}
            {pending ? (
              <div className={styles.typing} aria-label="Joben is typing">
                <span />
                <span />
                <span />
              </div>
            ) : null}
          </div>

          {messages.length <= 2 ? (
            <div className={styles.prompts}>
              {JOBEN_SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className={styles.promptBtn}
                  onClick={() => void sendMessage(prompt)}
                  disabled={pending}
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}

          <form className={styles.composer} onSubmit={handleSubmit}>
            <label className={styles.srOnly} htmlFor="joben-chat-input">
              Message Joben
            </label>
            <textarea
              id="joben-chat-input"
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Message Joben…"
              className={styles.input}
              disabled={pending}
            />
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={pending || !input.trim()}
              aria-label="Send message"
            >
              <Send size={16} aria-hidden />
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className={`${styles.launcher} ${open ? styles.launcherOpen : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="joben-chat-panel"
        aria-label={open ? "Close Joben chat" : "Open Joben chat"}
      >
        {open ? (
          <X size={22} aria-hidden />
        ) : (
          <MessageCircle size={22} aria-hidden />
        )}
        <span className={styles.launcherLabel}>Joben</span>
      </button>
    </div>
  );
}
