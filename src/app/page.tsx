export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-sm font-medium text-muted-foreground">
        University of Baguio
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        Mr. &amp; Ms. SIT — Netizen&rsquo;s Choice
      </h1>
      <p className="mt-4 max-w-sm text-base text-muted-foreground">
        Voting opens soon for eligible University of Baguio students and
        employees.
      </p>
      <p className="mt-16 text-xs text-muted-foreground">
        Voting Technology Partner —{" "}
        <span className="font-medium text-foreground">CAFTON</span>
      </p>
    </div>
  );
}
