const countries = [
  { flag: "🇺🇸", name: "USA", users: "320k" },
  { flag: "🇧🇷", name: "Brazil", users: "210k" },
  { flag: "🇯🇵", name: "Japan", users: "180k" },
  { flag: "🇰🇷", name: "Korea", users: "165k" },
  { flag: "🇫🇷", name: "France", users: "140k" },
  { flag: "🇲🇽", name: "Mexico", users: "130k" },
  { flag: "🇩🇪", name: "Germany", users: "120k" },
  { flag: "🇮🇳", name: "India", users: "290k" },
  { flag: "🇬🇧", name: "UK", users: "150k" },
  { flag: "🇮🇹", name: "Italy", users: "95k" },
  { flag: "🇪🇸", name: "Spain", users: "110k" },
  { flag: "🇨🇦", name: "Canada", users: "85k" },
];

export const Countries = () => {
  return (
    <section id="countries" className="px-4 md:px-8 py-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="sticker bg-accent text-accent-foreground mb-3 inline-flex">🌍 worldwide</div>
            <h2 className="font-display font-bold text-5xl md:text-7xl leading-none">
              pick your <br />
              <span className="text-stroke">destination.</span>
            </h2>
          </div>
          <p className="font-body font-medium text-muted-foreground max-w-sm">
            Filter by country & only match with people you actually wanna meet. Travel without leaving your bed.
          </p>
        </div>

        <div className="glass brutal-lg rounded-3xl p-4 md:p-6">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {countries.map((c, i) => (
              <button
                key={i}
                className="brutal-hover bg-card border-2 border-foreground rounded-2xl p-3 md:p-4 text-center hover:bg-highlight transition-colors group"
              >
                <div className="text-4xl md:text-5xl mb-2 group-hover:scale-125 transition-transform">{c.flag}</div>
                <div className="font-display font-bold text-sm md:text-base">{c.name}</div>
                <div className="font-body text-xs text-muted-foreground font-semibold">{c.users} online</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
