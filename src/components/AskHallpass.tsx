import { useEffect, useId, useRef, useState } from "react";
import { AGENT_LIMITS, type AgentMessage } from "../../shared/api";
import { ApiFailure } from "../lib/api";
import { emptyAgentReplyState, type AgentReplyState } from "../screens/ask/parseSse";
import { OFFLINE_AGENT_COPY, streamAgentReply } from "../screens/ask/streamAgent";
import { Button, HelloMark, Notice, Sheet, Stack, TextArea } from "../ui";

export interface AskHallpassProps {
  /** When set with `onClose`, the sheet is controlled and the corner trigger is hidden. */
  open?: boolean;
  onClose?: () => void;
}

const INTRO =
  "Ask about your plan, the next session, or how to reach a room. Short answers with specific rooms and times.";

function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const markOnline = () => setOnline(true);
    const markOffline = () => setOnline(false);
    window.addEventListener("online", markOnline);
    window.addEventListener("offline", markOffline);
    return () => {
      window.removeEventListener("online", markOnline);
      window.removeEventListener("offline", markOffline);
    };
  }, []);
  return online;
}

function MessageBubble({ role, text }: { role: AgentMessage["role"]; text: string }) {
  const label = role === "user" ? "You" : "Hallpass";
  return (
    <div
      className={`rounded-xl border-2 border-line px-3 py-3 ${role === "user" ? "bg-canvas" : "bg-surface"}`}
    >
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 text-base leading-snug whitespace-pre-wrap text-ink">{text}</p>
    </div>
  );
}

function ReplyFlags({ reply }: { reply: AgentReplyState }) {
  return (
    <>
      {reply.fallback ? (
        <Notice tone="info" title="Model unavailable">
          This answer used the built-in fallback instead of a live model reply.
        </Notice>
      ) : null}
      {reply.stub ? (
        <Notice tone="stub" title="Stub response">
          The corner agent API is not fully wired yet in this environment.
        </Notice>
      ) : null}
      {reply.truncated ? (
        <Notice tone="info" title="Reply cut off">
          The reply was cut off before it finished. You can ask a shorter follow-up.
        </Notice>
      ) : null}
      {reply.error && reply.error !== "truncated" ? (
        <Notice tone="error" title="Could not finish">
          {reply.error}
        </Notice>
      ) : null}
    </>
  );
}

export function AskHallpass({ open: openProp, onClose }: AskHallpassProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = openProp !== undefined && onClose !== undefined;
  const open = controlled ? openProp : internalOpen;

  const listId = useId();
  const reqRef = useRef(0);
  const liveRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [live, setLive] = useState<AgentReplyState | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamFlags, setStreamFlags] = useState<AgentReplyState | null>(null);

  const charLimit = AGENT_LIMITS.maxChars;
  const atMessageCap = messages.length >= AGENT_LIMITS.maxMessages;
  const trimmed = draft.trim();
  const tooLong = draft.length > charLimit;
  const online = useOnline();
  const offline = !online;

  function closeSheet() {
    if (controlled) onClose?.();
    else setInternalOpen(false);
  }

  function openSheet() {
    if (controlled) return;
    setInternalOpen(true);
  }

  function setDraftCapped(value: string) {
    setDraft(value.slice(0, charLimit));
  }

  useEffect(() => {
    if (live?.text && liveRef.current) {
      liveRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [live?.text]);

  async function send() {
    if (!trimmed || tooLong || atMessageCap || sending || offline) return;
    const token = ++reqRef.current;
    const nextMessages: AgentMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setLive(emptyAgentReplyState());
    setStreamFlags(null);
    setSending(true);

    try {
      const result = await streamAgentReply(nextMessages, {
        onProgress: (state) => {
          if (token !== reqRef.current) return;
          setLive({ ...state });
        },
      });
      if (token !== reqRef.current) return;
      const assistantText = result.text.trim();
      if (assistantText) {
        setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
      }
      setStreamFlags(result);
      setLive(null);
    } catch (err) {
      if (token !== reqRef.current) return;
      setMessages(messages);
      setDraft(trimmed);
      setLive(null);
      setStreamFlags(null);
      if (err instanceof TypeError || (err instanceof Error && err.message === "Failed to fetch")) {
        setError(OFFLINE_AGENT_COPY);
      } else if (err instanceof ApiFailure) {
        setError(err.message);
      } else {
        setError("Something went wrong. Try again when you are back online.");
      }
    } finally {
      if (token === reqRef.current) setSending(false);
    }
  }

  const canSend = Boolean(trimmed) && !tooLong && !atMessageCap && !sending && !offline;
  const showLiveBubble = sending || (live !== null && live.text.length > 0);

  return (
    <>
      {controlled ? null : (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-[420px] justify-end px-4">
          <Button
            type="button"
            variant="secondary"
            className="pointer-events-auto w-auto min-w-0 gap-2 px-3 shadow-md"
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={openSheet}
          >
            <HelloMark compact />
            <span>Ask Hallpass</span>
          </Button>
        </div>
      )}

      <Sheet open={open} title="Ask Hallpass" onClose={closeSheet}>
        <Stack gap="sm">
          <HelloMark compact />
          <p className="text-sm text-muted">{INTRO}</p>

          {offline ? (
            <Notice tone="offline" title="You're offline">
              {OFFLINE_AGENT_COPY}
            </Notice>
          ) : null}

          {error ? (
            <Notice tone="error" title="Could not get an answer">
              {error}
            </Notice>
          ) : null}

          <div
            id={listId}
            className="flex max-h-[min(40dvh,320px)] flex-col gap-2 overflow-y-auto pr-1"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {messages.length === 0 && !showLiveBubble ? (
              <p className="text-sm text-muted">No messages yet.</p>
            ) : null}
            {messages.map((message, index) => (
              <MessageBubble key={`${message.role}-${index}`} role={message.role} text={message.content} />
            ))}
            {showLiveBubble ? (
              <div ref={liveRef}>
                <MessageBubble role="assistant" text={live?.text || (sending ? "…" : "")} />
              </div>
            ) : null}
            {streamFlags ? <ReplyFlags reply={streamFlags} /> : null}
          </div>

          {atMessageCap ? (
            <Notice tone="info" title="Message limit">
              This chat keeps at most {AGENT_LIMITS.maxMessages} messages.
            </Notice>
          ) : null}

          <TextArea
            label="Your question"
            name="ask-hallpass"
            value={draft}
            onChange={setDraftCapped}
            rows={3}
            disabled={sending || atMessageCap || offline}
            hint={`${draft.length}/${charLimit} characters. Up to ${AGENT_LIMITS.maxMessages} messages in this chat.`}
            placeholder="For example: What is my next session?"
          />

          {tooLong ? (
            <Notice tone="error" title="Too long">
              Shorten your message to {charLimit} characters or fewer.
            </Notice>
          ) : null}

          <Button type="button" variant="primary" disabled={!canSend} onClick={send}>
            {sending ? "Sending…" : "Send"}
          </Button>
        </Stack>
      </Sheet>
    </>
  );
}
