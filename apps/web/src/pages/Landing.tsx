import { useEffect, useRef, type ReactNode } from 'react';
import { useTheme } from '../theme';
import { Link } from '../router';

// Landing page design constraints (enterprise B2B): zinc neutrals with one
// blue accent, kept distinct from status colors; system-ui for prose and
// ui-monospace for machine data. Calm register, minimal motion (section
// reveals only, disabled under reduced motion). Pre-pilot product: no stats,
// logos, testimonials, or compliance claims anywhere on the page.

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          el.classList.add('is-visible');
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal ${className ?? ''}`}>
      {children}
    </div>
  );
}

function Header() {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <Mark />
          <span className="text-[15px] font-semibold tracking-wide">Veriq</span>
        </div>
        <nav aria-label="Primary" className="flex items-center gap-5 text-sm">
          <a href="#answer" className="text-muted hover:text-foreground">
            The answer
          </a>
          <a href="#guardrails" className="text-muted hover:text-foreground">
            Guardrails
          </a>
          <a href="#status" className="text-muted hover:text-foreground">
            Status
          </a>
          <button
            type="button"
            onClick={toggle}
            aria-pressed={theme === 'dark'}
            aria-label="Toggle dark mode"
            className="rounded-md border border-edge px-2 py-1 text-xs text-muted hover:text-foreground"
          >
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
          <Link
            to="/login"
            className="rounded-md bg-accent px-3.5 py-1.5 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

// Simple geometric wordmark placeholder; swap for the real logo when one exists.
function Mark() {
  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 items-center justify-center rounded-md border border-edge bg-surface"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <path d="M1 2 L7 12 L13 2" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="square" />
      </svg>
    </span>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-edge">
      <div className="hero-grid absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-16 md:grid-cols-[1fr_1.1fr] md:items-center md:pb-20 md:pt-20">
        <div>
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-5xl">
            Customer service answers with the evidence attached.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted">
            Veriq investigates transaction complaints across your real systems: transactions,
            service health, logs. Every claim cites a tool call. Missing data is named, never
            guessed.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90"
            >
              Sign in to your workspace
            </Link>
            <a
              href="#answer"
              className="rounded-md border border-edge bg-surface px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-accent"
            >
              See an answer
            </a>
          </div>
        </div>
        <Reveal>
          <AnswerCard />
        </Reveal>
      </div>
    </section>
  );
}

// A real component preview: the actual answer format the product renders
// (PRD §7). Not a screenshot, the interface itself.
function AnswerCard() {
  const findings = [
    'Charge settled 14:02:11',
    'Order status failed, provider error 504',
    'Error rate 4.8% during 13:55-14:10',
  ];
  return (
    <figure className="overflow-hidden rounded-lg border border-edge bg-surface">
      <figcaption className="border-b border-edge bg-background px-4 py-2.5 text-xs font-medium text-muted">
        Investigation TX-8817 · customer charged, order missing
      </figcaption>
      <div className="p-4 md:p-5">
        <p className="text-sm leading-relaxed text-foreground">
          The payment succeeded but the order was not created: the charge cleared at 14:02:11
          during a provider timeout window.
        </p>
        <h3 className="mt-4 text-xs font-semibold text-muted">Temuan</h3>
        <ul className="mt-2 space-y-2">
          {findings.map((f) => (
            <li key={f} className="flex items-baseline justify-between gap-3 text-sm text-foreground">
              <span>{f}</span>
              <span className="font-mono text-[11px] text-muted">[{f.slice(0, 2)}]</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {['transaction history', 'orders', 'service metrics'].map((s) => (
            <span
              key={s}
              className="rounded border border-edge bg-background px-2 py-0.5 font-mono text-[11px] text-muted"
            >
              {s}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-edge pt-3">
          <span className="text-xs text-muted">Status data</span>
          <span className="font-mono text-[11px] text-amber-700 dark:text-amber-400">sebagian</span>
        </div>
      </div>
    </figure>
  );
}

function Guardrails() {
  const byDesign: Array<[string, string]> = [
    ['Runs on your access rights', 'Every execution acts on behalf of the user who started it, within their tool and data scope.'],
    ['Reads through registered tools', 'The model selects tools; the tools produce the numbers. No free-form SQL.'],
    ['Every claim carries a source', 'A runtime validator rejects claims without a tool call from the same execution, before display.'],
    ['Audit log on every action', 'Tool calls, approvals, and permission changes are recorded immutably.'],
  ];
  const never: Array<[string, string]> = [
    ['No auto-sent replies', 'Drafts are reviewed by a CS agent first. Always.'],
    ['No production writes', 'Refunds, status changes, restarts are out of scope for the agent.'],
    ['No silent gaps', 'Failed or missing data appears as "unavailable", never as a guess.'],
  ];
  return (
    <section id="guardrails" className="border-b border-edge">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <Reveal>
          <h2 className="max-w-xl text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            The guardrails are the product.
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
            An enterprise AI tool earns its place by what it will not do. Veriq's defaults, by
            design and in code.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-10 md:grid-cols-2">
          <Reveal>
            <div className="rounded-lg border border-edge bg-surface p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-accent">By design</h3>
              <ul className="mt-4 space-y-5">
                {byDesign.map(([title, body]) => (
                  <li key={title}>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal>
            <div className="rounded-lg border border-edge bg-surface p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Never</h3>
              <ul className="mt-4 space-y-5">
                {never.map(([title, body]) => (
                  <li key={title}>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal>
            <TraceLedger />
          </Reveal>
          <Reveal>
            <div className="rounded-lg border border-edge bg-surface p-6">
              <h3 className="text-sm font-semibold text-foreground">Configured by your engineers</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Service Catalog, Transaction Data Mapping, Investigation Playbooks, and Response
                Templates are per-organization configuration your team owns. Nothing about your
                systems is hardcoded by us.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Answers and UI text run in Bahasa Indonesia and English.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// The execution ledger is the M3 heart of the product: a durable record of
// every reasoning step, tool call, and approval, resumed if a worker dies.
function TraceLedger() {
  const steps = [
    ['reasoning', 'parse complaint, select tools'],
    ['tool_call', 'transaction.get_history C-1042'],
    ['tool_call', 'orders.read TX-8817'],
    ['approval', 'escalation confirmed by user'],
  ];
  return (
    <div className="rounded-lg border border-edge bg-surface">
      <div className="border-b border-edge px-4 py-2.5 text-xs font-medium text-muted">
        Execution ledger (resumable)
      </div>
      <ol className="p-4">
        {steps.map(([kind, detail], i) => (
          <li key={detail} className="flex items-baseline gap-3 pb-3 last:pb-0">
            <span className="w-6 shrink-0 font-mono text-[11px] text-muted">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="w-20 shrink-0 font-mono text-[11px] text-accent">{kind}</span>
            <span className="font-mono text-xs text-foreground">{detail}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Status() {
  const items: Array<[string, string, string]> = [
    ['Multi-tenant isolation', 'built', 'organization_id on every record, Postgres row-level security, cross-org access tested to zero in CI.'],
    ['Authentication', 'built', 'Password and OIDC single sign-on with audit trail.'],
    ['Evidence pipeline', 'in build', 'Structured answers with source references; the runtime validator is the next milestone.'],
    ['Support Investigation flow', 'in build', 'Complaint in, evidence-backed answer, reviewed draft reply, confirmed escalation.'],
    ['Pilot with CS teams', 'not started', 'Phase 1 exit requires a 4-week pilot with real agents; selection is open.'],
  ];
  return (
    <section id="status" className="border-b border-edge">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <Reveal>
          <h2 className="max-w-xl text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Where the product stands.
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
            Per component, plainly, because we ask the same of our product.
          </p>
        </Reveal>
        <Reveal>
          <dl className="mt-10 grid gap-x-10 gap-y-6 md:grid-cols-2">
            {items.map(([name, state, note]) => (
              <div key={name} className="border-t border-edge pt-4">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-sm font-medium text-foreground">{name}</dt>
                  <dd className="font-mono text-[11px] text-muted">{state}</dd>
                </div>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted">{note}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section className="border-b border-edge">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <Reveal>
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                Run the pilot with us.
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
                We are selecting CS teams with a supported monitoring stack and read-only
                transaction data. Pilot enquiries: <span className="font-mono text-xs">[CONTACT_EMAIL]</span>
              </p>
            </div>
            <Link
              to="/login"
              className="justify-self-start rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 md:justify-self-end"
            >
              Sign in to your workspace
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <div className="flex items-center gap-2.5">
          <Mark />
          <span>Veriq</span>
        </div>
        <span>Support Investigation Assistant · pre-release software</span>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Hero />
        <Guardrails />
        <Status />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
