import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  ArrowUp,
  PackageSearch,
  RotateCcw,
  Truck,
  Undo2,
  X,
} from 'lucide-react';
import { BotIcon } from './components/BotIcon';
import { BotMessageSquareIcon } from './components/BotMessageSquareIcon';

const EASE = [0.22, 1, 0.36, 1];
const OFFLINE_REPLY = 'Our support system is currently offline. Please try again later.';
const SPAM_REPLY = 'Please enter a clear question about your Kore Essentials order (e.g., #1024) or our store policies.';
const DUPLICATE_REPLY = 'You just sent that message—please check the reply above or ask a different question.';
const RATE_LIMIT_REPLY = 'You are sending messages too quickly. Please wait a moment and try again.';

const VALID_SHORT_WORDS = new Set([
  'hi', 'hey', 'yo', 'ok', 'yes', 'no', 'uk', 'faq', 'help', 'order', 'status',
  'return', 'policy', 'ship', 'cost', 'free', 'days', 'late', 'lost', 'item',
  'when', 'what', 'where', 'who', 'why', 'how', 'can', 'may', 'buy', 'new', 'fee', 'tax',
]);
const KEYBOARD_MASH_RE = /(asdf|sdfg|dfgh|fghj|ghjk|hjkl|qwer|wert|erty|rtyu|tyui|yuio|uiop|zxcv|xcvb|cvbn|vbnm)/i;
const CONSONANT_CLUSTER_RE = /[bcdfghjklmnpqrstvwxyz]{5,}/i;
const CHAR_FLOOD_RE = /(.)\1{4,}/i;
const PAIR_FLOOD_RE = /(..)\1{3,}/i;

function validateClientInput(text, previousUserMessages) {
  const cleaned = text.trim();
  if (cleaned.length < 2) return SPAM_REPLY;

  const normalized = cleaned.toLowerCase().replace(/\s+/g, ' ');
  const recentNormalized = previousUserMessages.slice(-2).map((m) => m.toLowerCase().replace(/\s+/g, ' '));
  if (recentNormalized.includes(normalized)) return DUPLICATE_REPLY;

  if (
    CHAR_FLOOD_RE.test(cleaned) ||
    PAIR_FLOOD_RE.test(cleaned) ||
    KEYBOARD_MASH_RE.test(cleaned) ||
    CONSONANT_CLUSTER_RE.test(cleaned)
  ) {
    return SPAM_REPLY;
  }

  if (/^#?\d{3,6}$/.test(cleaned)) return null;

  const tokens = cleaned.toLowerCase().match(/[a-z0-9#]+/g) || [];
  if (tokens.length === 0) return SPAM_REPLY;

  const multiCharTokens = tokens.filter((t) => t.replace(/^#/, '').length >= 2);
  if (multiCharTokens.length === 0) return SPAM_REPLY;

  if (tokens.length === 1 && /^[a-z]{2,3}$/.test(tokens[0]) && !VALID_SHORT_WORDS.has(tokens[0])) {
    return SPAM_REPLY;
  }

  const alphaWords4Plus = tokens.filter((t) => /^[a-z]{4,}$/.test(t));
  if (alphaWords4Plus.length > 0 && !alphaWords4Plus.some((w) => /[aeiouy]/.test(w))) {
    return SPAM_REPLY;
  }

  return null;
}

const SUGGESTIONS = [
  { icon: PackageSearch, label: 'Where’s order #1024?', prompt: 'Where is order #1024?' },
  { icon: Undo2, label: 'Return policy', prompt: 'What is your return policy?' },
  { icon: Truck, label: 'Shipping costs', prompt: 'How much is shipping?' },
];

const SCENARIOS = [
  {
    id: 'orders',
    title: 'Order tracking',
    note: 'Looks up the status of an order',
    prompts: ['Where is order #1024?', 'What is the status of order #1025?', 'Has order #1026 been delivered?'],
  },
  {
    id: 'policies',
    title: 'Store policies',
    note: 'Answers from the store’s own policies',
    prompts: ['What is your return policy?', 'How much is shipping?'],
  },
  {
    id: 'guardrails',
    title: 'Guardrails',
    note: 'Won’t invent data or drift off-topic',
    prompts: ['Where is order #9999?', 'Write me a poem about cats'],
  },
];

const RAW_KNOWLEDGE_BASE = `Company: Kore Essentials (Premium tech accessory brand)
Role: Customer support assistant. Be brief and helpful.

Store Policies:
- Returns: 14-day returns accepted.
- Shipping: Free shipping on orders over £50; standard shipping is £5 (3–5 days).

Order Database:
- Order #1024: Out for delivery today
- Order #1025: Processing
- Order #1026: Delivered Oct 10

Rules & Guardrails:
- Only reference this exact order and policy data.
- Never invent order statuses or unverified policies.
- Politely decline unrelated or off-topic questions.`;

/* Rehype plugin: wraps every word in a span so replies can fade in word by word. */
function wordReveal(step, base) {
  return () => (tree) => {
    let i = 0;
    const walk = (node) => {
      if (!node.children) return;
      const out = [];
      for (const child of node.children) {
        if (child.type === 'text') {
          for (const part of child.value.split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) {
              out.push({ type: 'text', value: part });
            } else {
              out.push({
                type: 'element',
                tagName: 'span',
                properties: { className: ['word'], style: `animation-delay:${(base + i++ * step).toFixed(3)}s` },
                children: [{ type: 'text', value: part }],
              });
            }
          }
        } else {
          walk(child);
          out.push(child);
        }
      }
      node.children = out;
    };
    walk(tree);
  };
}

const SAFE_DISALLOWED_MD_ELEMENTS = ['a', 'img', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'style'];

function Markdown({ text, reveal = false, delay = 0 }) {
  const plugins = useMemo(() => {
    if (!reveal) return [];
    const words = Math.max(1, text.trim().split(/\s+/).length);
    return [wordReveal(Math.min(0.03, 1.2 / words), delay)];
  }, [text, reveal, delay]);

  return (
    <div className="md">
      <ReactMarkdown
        rehypePlugins={plugins}
        disallowedElements={SAFE_DISALLOWED_MD_ELEMENTS}
        unwrapDisallowed
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

const Message = memo(function Message({ role, text }) {
  const isUser = role === 'user';
  return (
    <motion.div
      className={`row ${isUser ? 'is-user' : ''}`}
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      style={{ transformOrigin: isUser ? '100% 100%' : '0% 100%' }}
    >
      <div className={`bubble ${isUser ? 'user' : 'ai'}`}>
        <Markdown text={text} reveal={!isUser} delay={0.1} />
      </div>
    </motion.div>
  );
});

function Typing() {
  return (
    <motion.div
      className="row"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
    >
      <div className="bubble ai typing" aria-label="Assistant is typing">
        <span /><span /><span />
      </div>
    </motion.div>
  );
}

const SCRIM = {
  hidden: { opacity: 0, transition: { duration: 0.2 } },
  show: { opacity: 1, transition: { duration: 0.3 } },
};
const PANEL = {
  hidden: { opacity: 0, y: 24, scale: 0.96, filter: 'blur(6px)', transition: { duration: 0.18 } },
  show: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 380, damping: 32 } },
};

function GuideModal({ onClose, onPick, busy }) {
  const [tab, setTab] = useState('try');
  const panelRef = useRef(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <motion.div className="modal-layer" initial="hidden" animate="show" exit="hidden">
      <motion.div className="modal-scrim" variants={SCRIM} onClick={onClose} />
      <motion.div
        ref={panelRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Project guide"
        tabIndex={-1}
        variants={PANEL}
      >
        <div className="modal-head">
          <div className="tabs" role="tablist">
            {[
              ['try', 'Try it'],
              ['info', 'Company info'],
            ].map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className="tab" onClick={() => setTab(id)}>
                {tab === id && (
                  <motion.span layoutId="tab-pill" className="tab-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
                )}
                {label}
              </button>
            ))}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close guide">
            <X size={18} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            className="modal-body"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'try' && (
              <>
                <p className="lead">Tap a scenario to run it. Sample orders: #1024, #1025, #1026.</p>
                {SCENARIOS.map((scenario, index) => (
                  <motion.div
                    key={scenario.id}
                    className="scenario"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.05 + index * 0.07, ease: EASE }}
                  >
                    <div>
                      <h3>{scenario.title}</h3>
                      <p>{scenario.note}</p>
                    </div>
                    <div className="prompt-row">
                      {scenario.prompts.map((prompt) => (
                        <button key={prompt} type="button" className="prompt" disabled={busy} onClick={() => onPick(prompt)}>
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </>
            )}

            {tab === 'info' && (
              <>
                <p className="lead">All company policies, order records, and instructions the AI responds from.</p>
                <motion.div
                  className="kb-field-wrap"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  <textarea
                    id="kb-raw-field"
                    className="kb-textarea"
                    readOnly
                    value={RAW_KNOWLEDGE_BASE}
                    rows={18}
                    aria-label="All company policies, order records, and instructions the AI responds from"
                  />
                </motion.div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const messagesRef = useRef([]);
  const idRef = useRef(0);
  const runRef = useRef(0);
  const busyRef = useRef(false);
  const sendTimestampsRef = useRef([]);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const guideBtnRef = useRef(null);

  const send = useCallback(async (raw) => {
    const text = String(raw || '').trim().slice(0, 500);
    if (!text || busyRef.current) return;
    busyRef.current = true;
    const run = runRef.current;

    const previousUserMessages = messagesRef.current
      .filter((m) => m.role === 'user')
      .map((m) => m.text);

    messagesRef.current = [...messagesRef.current, { id: ++idRef.current, role: 'user', text }];
    setMessages(messagesRef.current);
    setDraft('');
    setTyping(true);

    const started = Date.now();
    const recent1m = sendTimestampsRef.current.filter((t) => started - t <= 60000);
    const recent10s = recent1m.filter((t) => started - t <= 10000);
    const isClientRateLimited = recent10s.length >= 3 || recent1m.length >= 12;
    const clientSpamReason = isClientRateLimited
      ? RATE_LIMIT_REPLY
      : validateClientInput(text, previousUserMessages);

    let reply = OFFLINE_REPLY;
    if (clientSpamReason) {
      reply = clientSpamReason;
    } else {
      sendTimestampsRef.current = [...recent1m, started];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            messages: messagesRef.current.slice(-12).map(({ role, text: content }) => ({ role, content })),
          }),
        });
        const data = await response.json().catch(() => null);
        if (data && typeof data.reply === 'string' && data.reply.trim()) {
          reply = data.reply.trim();
        }
      } catch {
        /* backend unreachable or timed out: fall through to the offline message */
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // Keep the typing indicator on screen long enough to feel natural.
    const wait = 700 - (Date.now() - started);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    if (run !== runRef.current) return; // conversation was reset while waiting

    messagesRef.current = [...messagesRef.current, { id: ++idRef.current, role: 'assistant', text: reply }];
    setMessages(messagesRef.current);
    setTyping(false);
    busyRef.current = false;
  }, []);

  const reset = useCallback(() => {
    runRef.current += 1;
    busyRef.current = false;
    messagesRef.current = [];
    setMessages([]);
    setTyping(false);
    setDraft('');
    inputRef.current?.focus();
  }, []);

  const openGuide = useCallback(() => setGuideOpen(true), []);
  const closeGuide = useCallback(() => {
    setGuideOpen(false);
    guideBtnRef.current?.focus();
  }, []);
  const pickPrompt = useCallback(
    (prompt) => {
      setGuideOpen(false);
      send(prompt);
      inputRef.current?.focus();
    },
    [send],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return undefined;
    const timer = setTimeout(() => inputRef.current?.focus(), 1100);
    return () => clearTimeout(timer);
  }, []);

  const canSend = draft.trim().length > 0 && !typing;

  return (
    <MotionConfig reducedMotion="user">
      <div className="stage">
        <header className="topbar">
          <h1 className="headline">
            <motion.span
              className="hw"
              initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
            >
              Customer Support Chatbot
            </motion.span>
            <motion.span
              className="title-bot-icon"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.25, ease: EASE }}
            >
              <BotIcon size={24} />
            </motion.span>
            <motion.span
              className="hw"
              initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.7, delay: 0.32, ease: EASE }}
            >
              Project
            </motion.span>
            <motion.button
              ref={guideBtnRef}
              type="button"
              className="use-cases-btn"
              aria-haspopup="dialog"
              aria-label="Try Me!"
              onClick={openGuide}
              initial={{ opacity: 0, y: 14, scale: 0.85, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.7, delay: 0.42, ease: EASE }}
              whileTap={{ scale: 1.08 }}
            >
              Try Me!
            </motion.button>
          </h1>
        </header>

        <main className="stage-center">
          <motion.div
            className="chat-shell"
            initial={{ opacity: 0, y: 36, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, ease: EASE }}
          >
            <section className="chat-window" aria-label="Kore Assistant chat">

              <div className="chat-head">
                <span className="agent-name">KORE Assistant</span>
                <AnimatePresence>
                  {messages.length > 0 && (
                    <motion.button
                      key="reset"
                      type="button"
                      className="icon-btn"
                      onClick={reset}
                      aria-label="Start a new conversation"
                      title="New conversation"
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      whileTap={{ rotate: -180 }}
                    >
                      <RotateCcw size={17} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              <div className="chat-body">
                <div className="chat-scroll" ref={scrollRef} role="log" aria-live="polite">
                  {messages.map((message) => (
                    <Message key={message.id} role={message.role} text={message.text} />
                  ))}
                  <AnimatePresence>{typing && <Typing key="typing" />}</AnimatePresence>
                </div>

                <AnimatePresence>
                  {messages.length === 0 && (
                    <motion.div
                      key="empty"
                      className="empty"
                      exit={{ opacity: 0, y: -14, scale: 0.98, transition: { duration: 0.25 } }}
                    >
                      <motion.div
                        className="bot-badge-wrap"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
                      >
                        <BotMessageSquareIcon size={46} className="bot-solid-icon" />
                      </motion.div>
                      <motion.h2
                        className="empty-title"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
                      >
                        How can I help you today?
                      </motion.h2>
                      <div className="chips">
                        {SUGGESTIONS.map((suggestion, i) => {
                          const Icon = suggestion.icon;
                          return (
                            <motion.button
                              key={suggestion.label}
                              type="button"
                              className="chip"
                              disabled={typing}
                              onClick={() => send(suggestion.prompt)}
                              initial={{ opacity: 0, y: 14 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.6, delay: 0.7 + i * 0.09, ease: EASE }}
                              whileHover={{ y: -2 }}
                              whileTap={{ scale: 0.97 }}
                            >
                              <Icon size={16} strokeWidth={1.9} />
                              {suggestion.label}
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <form
                className="composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  send(draft);
                }}
              >
                <div className="composer-field">
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Message Kore Assistant"
                    aria-label="Message"
                    maxLength={500}
                    autoComplete="off"
                    enterKeyHint="send"
                  />
                  <motion.button
                    type="submit"
                    className="send"
                    disabled={!canSend}
                    aria-label="Send message"
                    whileHover={canSend ? { scale: 1.07 } : undefined}
                    whileTap={canSend ? { scale: 0.9 } : undefined}
                  >
                    <ArrowUp size={18} strokeWidth={2.4} />
                  </motion.button>
                </div>
              </form>
            </section>
          </motion.div>
        </main>

        <AnimatePresence>
          {guideOpen && <GuideModal key="guide" onClose={closeGuide} onPick={pickPrompt} busy={typing} />}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
