const items = ["✦ no bots", "✦ real humans", "✦ 195 countries", "✦ live 24/7", "✦ swipe, match, vibe", "✦ gen-z approved", "✦ no cringe"];

export const Marquee = () => {
  return (
    <div className="border-y-2 border-foreground bg-foreground text-background py-4 overflow-hidden">
      <div className="marquee flex gap-8 whitespace-nowrap font-display font-bold text-2xl md:text-3xl">
        {[...items, ...items, ...items].map((t, i) => (
          <span key={i} className="flex items-center gap-8">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
};
