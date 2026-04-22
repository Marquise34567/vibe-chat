import { Mic, Video, SkipForward, Heart, Flag } from "lucide-react";
import personMika from "@/assets/person-mika.jpg";
import personLeo from "@/assets/person-leo.jpg";
import personAya from "@/assets/person-aya.jpg";
import personKai from "@/assets/person-kai.jpg";

const tiles = [
  { name: "Mika", country: "🇯🇵", age: 22, color: "bg-primary", img: personMika },
  { name: "Leo", country: "🇧🇷", age: 24, color: "bg-accent", img: personLeo },
  { name: "Aya", country: "🇫🇷", age: 21, color: "bg-secondary", img: personAya },
  { name: "Kai", country: "🇰🇷", age: 23, color: "bg-highlight", img: personKai },
];

export const LivePreview = () => {
  return (
    <section id="how" className="px-4 md:px-8 py-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="sticker bg-secondary mb-4 inline-flex">peek inside 👀</div>
          <h2 className="font-display font-bold text-5xl md:text-7xl">
            it's giving <span className="bg-highlight border-2 border-foreground brutal px-3 inline-block -rotate-1">unreal</span>
          </h2>
        </div>

        <div className="glass brutal-lg rounded-3xl p-4 md:p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            {tiles.map((t, i) => (
              <div
                key={i}
                className={`${t.color} aspect-[3/4] rounded-2xl border-2 border-foreground brutal relative overflow-hidden group cursor-pointer hover:scale-105 transition-transform`}
              >
                <img
                  src={t.img}
                  alt={`${t.name}, ${t.age}, from ${t.country}`}
                  loading="lazy"
                  width={768}
                  height={1024}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/10 to-transparent" />
                {i === 0 && (
                  <div className="absolute top-2 left-2 sticker bg-destructive text-destructive-foreground text-xs animate-wiggle">
                    ● LIVE
                  </div>
                )}
                <div className="absolute top-2 right-2 text-3xl">{t.country}</div>
                <div className="absolute bottom-3 left-3 text-background">
                  <div className="font-display font-bold text-lg">{t.name}, {t.age}</div>
                  <div className="text-xs font-semibold opacity-80">tap to vibe</div>
                </div>
              </div>
            ))}
          </div>

          {/* Control bar */}
          <div className="glass-dark rounded-2xl p-3 flex items-center justify-center gap-2 md:gap-4">
            {[
              { icon: Mic, label: "mute" },
              { icon: Video, label: "cam" },
              { icon: Heart, label: "fav", primary: true },
              { icon: SkipForward, label: "next" },
              { icon: Flag, label: "report" },
            ].map((c, i) => (
              <button
                key={i}
                className={`${c.primary ? 'bg-primary' : 'bg-background'} w-12 h-12 md:w-14 md:h-14 rounded-xl border-2 border-background flex items-center justify-center hover:scale-110 transition-transform`}
              >
                <c.icon className={`w-5 h-5 ${c.primary ? 'text-primary-foreground' : 'text-foreground'}`} strokeWidth={3} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
