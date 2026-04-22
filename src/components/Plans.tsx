import { Check, Crown, Rocket, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    tag: "starter pack",
    icon: Sparkles,
    bg: "bg-card",
    accent: "bg-secondary",
    rotate: "-rotate-2",
    features: ["Random matching", "5 country filters", "Basic chat tools", "Ads between matches"],
    cta: "Start free",
  },
  {
    name: "Plus",
    price: "$6.99",
    tag: "most popular ⭐",
    icon: Rocket,
    bg: "bg-primary text-primary-foreground",
    accent: "bg-highlight text-highlight-foreground",
    rotate: "rotate-1",
    features: ["Unlimited country filters", "Gender filters", "No ads, ever", "Priority matching", "See who liked you"],
    cta: "Go Plus",
    featured: true,
  },
  {
    name: "VIP",
    price: "$14.99",
    tag: "main character energy",
    icon: Crown,
    bg: "bg-foreground text-background",
    accent: "bg-primary text-primary-foreground",
    rotate: "-rotate-1",
    features: ["Everything in Plus", "VIP badge on profile", "Rewind last skip", "HD video quality", "Translate live captions", "Concierge support"],
    cta: "Get VIP",
  },
];

export const Plans = () => {
  return (
    <section id="plans" className="px-4 md:px-8 py-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="sticker bg-highlight mb-4 inline-flex">subscriptions 💸</div>
          <h2 className="font-display font-bold text-5xl md:text-7xl">
            level <span className="bg-accent text-accent-foreground border-2 border-foreground brutal px-3 inline-block rotate-2">up.</span>
          </h2>
          <p className="font-body text-muted-foreground mt-4 max-w-md mx-auto font-medium">Cancel anytime. No weird fees. Just unlock the cool stuff.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`${p.bg} ${p.rotate} border-2 border-foreground rounded-3xl p-6 brutal-lg hover:rotate-0 transition-transform duration-300`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl border-2 border-foreground bg-background text-foreground flex items-center justify-center brutal-sm">
                  <p.icon className="w-6 h-6" strokeWidth={3} />
                </div>
                <span className={`${p.accent} border-2 border-foreground rounded-full px-3 py-1 font-display font-bold text-xs`}>
                  {p.tag}
                </span>
              </div>
              <h3 className="font-display font-bold text-3xl mb-1">{p.name}</h3>
              <div className="font-display font-bold text-5xl mb-6">
                {p.price}
                <span className="text-base font-body opacity-70">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 font-body font-semibold text-sm">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={4} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`brutal-hover w-full ${
                  p.featured ? "bg-highlight text-highlight-foreground" : "bg-background text-foreground"
                } border-2 border-foreground rounded-xl py-3 font-display font-bold`}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
