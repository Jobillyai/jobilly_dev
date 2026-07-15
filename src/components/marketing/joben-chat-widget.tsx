"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { Route } from "next";
import { Send, SquarePen, X } from "lucide-react";
import { JOBEN_SUGGESTED_PROMPTS } from "@/lib/joben/public-knowledge";
import {
  getJobenLinksInContent,
  JOBEN_LINKS,
} from "@/lib/joben/joben-redirects";
import { askJobenAction } from "@/server/actions/joben-chat";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { JobenAvatar } from "@/components/marketing/joben-avatar";
import { JobenWebBackground } from "@/components/marketing/joben-web-background";
import styles from "./joben-chat-widget.module.css";

type JobenTheme = "light" | "dark";

function getDocumentTheme(): JobenTheme {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

function subscribeDocumentTheme(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  return () => observer.disconnect();
}

function useJobenTheme(): JobenTheme {
  return useSyncExternalStore(
    subscribeDocumentTheme,
    getDocumentTheme,
    () => "light",
  );
}

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

function stripRedirectPaths(content: string): string {
  let text = content;
  for (const link of JOBEN_LINKS) {
    text = text.split(link.path).join("");
  }
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([.!?])/g, "$1")
    .trim();
}

function formatMarkdownLite(text: string): string {
  return (
    text
      // "* item" / "- item" bullets at line start -> "• item"
      .replace(/^[ \t]*[*-][ \t]+/gm, "• ")
      // markdown headings "### Title" -> "Title"
      .replace(/^[ \t]*#{1,4}[ \t]+/gm, "")
  );
}

function renderAssistantContent(content: string) {
  const redirects = getJobenLinksInContent(content);
  const displayText = redirects.length > 0 ? stripRedirectPaths(content) : content;

  return formatMarkdownLite(displayText);
}

function renderBoldText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const boldPattern = /\*{2,3}([^*]+?)\*{2,3}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = boldPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    nodes.push(<strong key={`${match.index}-${match[1]}`}>{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function AssistantMessageBody({
  content,
  onRedirect,
}: {
  content: string;
  onRedirect: () => void;
}) {
  const redirects = getJobenLinksInContent(content);
  const displayText = renderAssistantContent(content);

  return (
    <div className={styles.messageBody}>
      <p className={styles.messageBubble}>{renderBoldText(displayText)}</p>
      {redirects.length > 0 ? (
        <div className={styles.redirectRow}>
          {redirects.map((link) => (
            <Link
              key={link.path}
              href={link.path as Route}
              className={styles.redirectBtn}
              onClick={onRedirect}
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function JobenChatWidget() {
  const theme = useJobenTheme();
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

  const closeChat = useCallback(() => {
    setOpen(false);
  }, []);

  const startNewChat = useCallback(() => {
    if (pending) {
      return;
    }

    setMessages([INITIAL_MESSAGE]);
    setInput("");
    inputRef.current?.focus();
  }, [pending]);

  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        closeChat();
      }
    },
    [closeChat],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeChat();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeChat, open]);

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

  const showWelcomeHero =
    messages.length === 1 && messages[0]?.id === "welcome" && !pending;
  const visibleMessages = showWelcomeHero ? [] : messages;

  const chatPanel = open ? (
    <div
      className={styles.overlay}
      data-joben-theme={theme}
      role="presentation"
      onClick={handleBackdropClick}
    >
      <section
        id="joben-chat-panel"
        className={styles.panel}
        data-joben-theme={theme}
        role="dialog"
        aria-modal="true"
        aria-label="Joben chat"
        onClick={(event) => event.stopPropagation()}
      >
        <JobenWebBackground theme={theme} />

        <header className={styles.header}>
          <div className={styles.headerIdentity}>
            <JobenAvatar size="md" showOnline />
            <div className={styles.headerCopy}>
              <p className={styles.headerName}>Joben</p>
              <p className={styles.headerMeta}>Your Jobilly guide · Online</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <ThemeToggle compact className={styles.themeToggle} />
            <button
              type="button"
              className={styles.newChatBtn}
              onClick={startNewChat}
              disabled={pending || showWelcomeHero}
              aria-label="Start new chat"
            >
              <SquarePen size={16} aria-hidden />
              <span className={styles.newChatLabel}>New chat</span>
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={closeChat}
              aria-label="Close Joben chat"
            >
              <X size={20} aria-hidden />
            </button>
          </div>
        </header>

        <div className={styles.body}>
          <div className={styles.content}>
            {showWelcomeHero ? (
              <div className={styles.welcomeHero}>
                <h2 className={styles.welcomeTitle}>How can I help?</h2>
                <p className={styles.welcomeSubtitle}>
                  Ask about Jobilly AI, plans, mock interviews, and how we help
                  candidates get hired.
                </p>
              </div>
            ) : null}

            <div className={styles.messages} ref={listRef}>
              {visibleMessages.map((message) => (
                <article
                  key={message.id}
                  className={
                    message.role === "assistant"
                      ? styles.messageAssistant
                      : styles.messageUser
                  }
                >
                {message.role === "assistant" ? (
                  <JobenAvatar size="sm" />
                ) : null}
                {message.role === "assistant" ? (
                  <AssistantMessageBody
                    content={message.content}
                    onRedirect={closeChat}
                  />
                ) : (
                  <p className={styles.messageBubble}>{message.content}</p>
                )}
                </article>
              ))}
              {pending ? (
                <div className={styles.typing} aria-label="Joben is typing">
                  <JobenAvatar size="sm" />
                  <div className={styles.typingDots}>
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <footer className={styles.footer}>
            {showWelcomeHero ? (
              <div className={styles.prompts}>
                <p className={styles.promptsLabel}>Suggestions</p>
                <div className={styles.promptList}>
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
              </div>
            ) : (
              <div className={`${styles.prompts} ${styles.promptsCompact}`}>
                <div className={`${styles.promptList} ${styles.promptListScroll}`}>
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
              </div>
            )}

            <div className={styles.composerShell}>
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
                  <Send size={17} aria-hidden />
                </button>
              </form>
            </div>
          </footer>
        </div>
      </section>
    </div>
  ) : null;

  return (
    <div className={styles.root} data-joben-theme={theme} aria-live="polite">
      {typeof document !== "undefined" && chatPanel
        ? createPortal(chatPanel, document.body)
        : null}

      {!open ? (
        <button
          type="button"
          className={styles.launcher}
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls="joben-chat-panel"
          aria-label="Open Joben chat"
        >
          <JobenAvatar size="launcher" showOnline className={styles.launcherAvatar} />
        </button>
      ) : null}
    </div>
  );
}
