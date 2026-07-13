export function Header() {
  return (
    <header>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <a href="/" className="flex items-baseline gap-1.5">
          <span className="text-[14px] font-semibold text-foreground">AdMaker</span>
          <span className="text-[13px] text-muted-foreground">by Context.dev</span>
        </a>
        <a
          href="https://github.com/context-dot-dev/ad-maker"
          target="_blank"
          rel="noreferrer noopener"
          className="btn-secondary px-3.5 py-2 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 fill-current">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
          Open Source
        </a>
      </div>
    </header>
  );
}

export function FortuneCookie() {
  return (
    <a
      href="https://link.context.dev/branda"
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Built using Context.dev"
      className="fixed bottom-4 right-4 z-30 hidden opacity-90 transition-opacity hover:opacity-100 sm:block"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/fortunecookie.png" alt="Built using Context.dev" className="w-44 drop-shadow-md" />
    </a>
  );
}
