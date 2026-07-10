export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <a href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Context.dev" className="h-7 w-auto" />
        </a>
        <a href="https://context.dev" target="_blank" rel="noreferrer noopener" className="btn-gradient text-[13px]">Try Context.dev</a>
      </div>
    </header>
  );
}

export function FortuneCookie() {
  return (
    <a
      href="https://context.dev"
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Built using Context.dev"
      className="fixed bottom-3 right-3 z-30 opacity-90 transition-opacity hover:opacity-100 sm:bottom-4 sm:right-4"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/fortunecookie.png" alt="Built using Context.dev" className="w-36 drop-shadow-md sm:w-44" />
    </a>
  );
}
