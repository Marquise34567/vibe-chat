import { SEOPage, Section, H2, P, UL, LI, ComparisonTable, FAQ, faqToJson } from "../SEOPage";
import { useEffect } from "react";

type VSData = {
  slug: string;
  competitor: string;
  competitorUrl: string;
  title: string;
  subtitle: string;
  pageTitle: string;
  metaDesc: string;
  whatIs: string;
  problems: string[];
  betterBecause: string[];
  faqs: { q: string; a: string }[];
};

const makeVSPage = (data: VSData) => {
  const Component = () => {
    useEffect(() => {
      document.title = data.pageTitle;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute("content", data.metaDesc);
    }, []);

    return (
      <SEOPage
        title={data.title}
        subtitle={data.subtitle}
        faqSchema={faqToJson(data.faqs)}
      >
        <Section>
          <H2>What is {data.competitor}?</H2>
          <P>{data.whatIs}</P>
        </Section>

        <Section>
          <H2>{data.competitor} vs FaceFrenzy</H2>
          <ComparisonTable rows={[
            { name: "FaceFrenzy", bots: "No", age: "16+", mods: "AI", signup: "None", free: "Yes", highlight: true },
            { name: data.competitor, bots: "Some", age: "18+", mods: "Manual", signup: "Optional", free: "Partial" },
            { name: "Omegle (closed)", bots: "Many", age: "None", mods: "Minimal", signup: "None", free: "Yes" },
            { name: "Chatroulette", bots: "Many", age: "None", mods: "Minimal", signup: "None", free: "Yes" },
            { name: "Emerald Chat", bots: "Some", age: "18+", mods: "Manual", signup: "Required", free: "Partial" },
          ]} />
        </Section>

        <Section>
          <H2>Why people switch from {data.competitor} to FaceFrenzy</H2>
          <UL>
            {data.betterBecause.map((point, i) => <LI key={i}>{point}</LI>)}
          </UL>
        </Section>

        <Section>
          <H2>Common issues with {data.competitor}</H2>
          <UL>
            {data.problems.map((problem, i) => <LI key={i} >{problem}</LI>)}
          </UL>
        </Section>

        <Section>
          <H2>Frequently asked questions</H2>
          <FAQ items={data.faqs} />
        </Section>
      </SEOPage>
    );
  };
  return Component;
};

// ── OmeTV ──
export const VSOmeTV = makeVSPage({
  slug: "ometv",
  competitor: "OmeTV",
  competitorUrl: "ome.tv",
  title: "Best OmeTV Alternative — FaceFrenzy",
  subtitle: "Switching from OmeTV? FaceFrenzy offers random video chat with real people, no bots, AI moderation, and group/blind modes OmeTV doesn't have.",
  pageTitle: "OmeTV Alternative — Better Than OmeTV? | FaceFrenzy",
  metaDesc: "Looking for an OmeTV alternative? FaceFrenzy is free random video chat with real people — no bots, AI moderated, 16+, group and blind modes. Try it free.",
  whatIs: "OmeTV (ome.tv) is a random video chat site that launched after Omegle's closure. It pairs strangers for webcam conversations and has a mobile app. It's one of the larger Omegle replacements, but it suffers from bots, inconsistent moderation, and limited features beyond basic 1-on-1 chat.",
  problems: [
    "Bots and fake accounts still slip through despite moderation claims",
    "No group chat — you're limited to 1-on-1 only",
    "No blind or voice-first mode",
    "Moderation is manual and reactive, not AI-powered",
    "Ban appeals are slow and often ignored",
    "No country filtering — you can't choose who you match with",
  ],
  betterBecause: [
    "<strong>Zero bots.</strong> FaceFrenzy only matches real, currently connected users. No scripted bot conversations.",
    "<strong>AI moderation.</strong> Camera feeds are scanned in real time — inappropriate content is flagged automatically, not after someone reports it.",
    "<strong>Three chat modes.</strong> Solo, Group (3-4 people), and Blind (voice first, cameras reveal at 30s). OmeTV only has 1-on-1.",
    "<strong>Country filtering.</strong> Pick a region or chat worldwide. OmeTV doesn't let you filter.",
    "<strong>16+ age gate.</strong> Everyone confirms before entering. OmeTV's age verification is weaker.",
    "<strong>No app required.</strong> Works in any browser. OmeTV pushes you toward their app.",
  ],
  faqs: [
    { q: "Is FaceFrenzy better than OmeTV?", a: "FaceFrenzy offers everything OmeTV does — free random video chat with strangers — plus group chat, blind mode, AI moderation, country filtering, and a strict no-bots policy. OmeTV is 1-on-1 only with manual moderation." },
    { q: "Is FaceFrenzy free like OmeTV?", a: "Yes, FaceFrenzy is completely free. No signup, no payment, no premium paywall for core features." },
    { q: "Can I use FaceFrenzy without downloading an app?", a: "Yes. FaceFrenzy works in any browser on desktop and mobile. No download needed, unlike OmeTV which pushes their mobile app." },
    { q: "Does FaceFrenzy have fewer bots than OmeTV?", a: "FaceFrenzy has zero bots. Every match is a real person currently online. OmeTV struggles with bots despite moderation efforts." },
  ],
});

// ── Emerald Chat ──
export const VSEmeraldChat = makeVSPage({
  slug: "emerald-chat",
  competitor: "Emerald Chat",
  competitorUrl: "emeraldchat.com",
  title: "Best Emerald Chat Alternative — FaceFrenzy",
  subtitle: "Looking for a better Emerald Chat alternative? FaceFrenzy has no bots, no signup wall, AI moderation, and group/blind modes Emerald doesn't offer.",
  pageTitle: "Emerald Chat Alternative — Better Than Emerald? | FaceFrenzy",
  metaDesc: "Switching from Emerald Chat? FaceFrenzy is free random video chat with real people — no bots, no signup required, AI moderated, 16+, group and blind modes.",
  whatIs: "Emerald Chat (emeraldchat.com) is an Omegle alternative that added features like interest matching and karma scores. It requires account creation and offers both free and premium tiers. While it has a loyal user base, the signup wall and partial paywall limit accessibility.",
  problems: [
    "Account signup is required before you can chat — friction kills the spontaneity",
    "Many features are locked behind a premium paywall",
    "Bots and fake accounts still appear despite the signup barrier",
    "No group video chat mode",
    "No blind/voice-first mode",
    "Interest matching often pairs you with empty rooms",
  ],
  betterBecause: [
    "<strong>No signup required.</strong> Pick a name and start chatting instantly. Emerald Chat forces you to create an account first.",
    "<strong>Completely free.</strong> No premium tier, no paywalled features. Emerald Chat locks core features behind a subscription.",
    "<strong>Group chat mode.</strong> Chat with 3-4 people at once. Emerald Chat is 1-on-1 only.",
    "<strong>Blind mode.</strong> Voice-first dating where cameras reveal after 30 seconds. Emerald doesn't have this.",
    "<strong>Zero bots.</strong> Real people only. Emerald's signup barrier doesn't stop bots — it just slows them down.",
    "<strong>AI moderation.</strong> Real-time camera scanning. Emerald relies on user reports and manual review.",
  ],
  faqs: [
    { q: "Is FaceFrenzy better than Emerald Chat?", a: "FaceFrenzy offers no-signup instant chat, group video, blind mode, AI moderation, and zero bots — all for free. Emerald Chat requires signup, has a premium paywall, and is 1-on-1 only." },
    { q: "Do I need to create an account on FaceFrenzy?", a: "No. Just pick a display name and start chatting. Emerald Chat requires account creation before you can use the service." },
    { q: "Is FaceFrenzy free?", a: "Yes, completely free with no premium tier. Emerald Chat locks features behind a paid subscription." },
  ],
});

// ── Chatroulette ──
export const VSChatroulette = makeVSPage({
  slug: "chatroulette",
  competitor: "Chatroulette",
  competitorUrl: "chatroulette.com",
  title: "Best Chatroulette Alternative — FaceFrenzy",
  subtitle: "Chatroulette has too many bots and no moderation. FaceFrenzy is the safe, bot-free alternative with AI moderation, 16+ age gate, and group/blind modes.",
  pageTitle: "Chatroulette Alternative — Better Than Chatroulette? | FaceFrenzy",
  metaDesc: "Looking for a Chatroulette alternative? FaceFrenzy is free random video chat with real people — no bots, AI moderated, 16+ age gated, group and blind modes. No signup.",
  whatIs: "Chatroulette (chatroulette.com) is one of the oldest random video chat sites, launched in 2009. It pioneered the 'next' button for skipping strangers. However, it's notorious for bots, explicit content, and minimal moderation — making it unreliable for genuine conversations.",
  problems: [
    "Bots are rampant — a large percentage of 'matches' are automated scripts",
    "Minimal moderation means explicit content is common",
    "No age gate — minors can access the site",
    "No group chat or blind mode",
    "No country or region filtering",
    "No AI content moderation — relies on slow manual reports",
  ],
  betterBecause: [
    "<strong>Zero bots.</strong> Every match on FaceFrenzy is a real person. Chatroulette is flooded with bots.",
    "<strong>AI content moderation.</strong> Real-time camera scanning detects and bans inappropriate content automatically. Chatroulette has minimal moderation.",
    "<strong>16+ age gate.</strong> Everyone confirms their age. Chatroulette has no age verification.",
    "<strong>Group and blind modes.</strong> Chat with 3-4 people or try voice-first blind dating. Chatroulette is 1-on-1 only.",
    "<strong>Country filtering.</strong> Choose your region. Chatroulette doesn't offer this.",
    "<strong>Safe and clean.</strong> AI moderation keeps the platform usable. Chatroulette's lack of moderation makes it unsafe.",
  ],
  faqs: [
    { q: "Is FaceFrenzy safer than Chatroulette?", a: "Yes. FaceFrenzy has a 16+ age gate, AI content moderation that scans camera feeds in real time, and zero bots. Chatroulette has minimal moderation, no age gate, and is known for bots and explicit content." },
    { q: "Does FaceFrenzy have bots like Chatroulette?", a: "No. FaceFrenzy has zero bots. Every match is a real, currently connected person. Chatroulette struggles with automated bot accounts." },
    { q: "Is FaceFrenzy free like Chatroulette?", a: "Yes, FaceFrenzy is completely free with no signup required. Chatroulette is also free but the experience is degraded by bots and lack of moderation." },
  ],
});

// ── Monkey App ──
export const VSMonkey = makeVSPage({
  slug: "monkey",
  competitor: "Monkey App",
  competitorUrl: "monkey.app",
  title: "Best Monkey App Alternative — FaceFrenzy",
  subtitle: "Monkey App requires a download and has limited features. FaceFrenzy works in any browser with no download, plus group chat and blind modes Monkey doesn't have.",
  pageTitle: "Monkey App Alternative — Better Than Monkey? | FaceFrenzy",
  metaDesc: "Looking for a Monkey App alternative? FaceFrenzy is free random video chat in your browser — no download, no bots, AI moderated, 16+, group and blind modes.",
  whatIs: "Monkey App (monkey.app) is a random video chat app popular with Gen Z. It's mobile-first, requires an app download, and focuses on short video conversations with strangers. It has a Snapchat-like vibe but is limited to mobile and 1-on-1 matching.",
  problems: [
    "Requires downloading an app — you can't just open a browser and start",
    "Mobile only — no desktop experience",
    "1-on-1 only, no group chat",
    "No blind or voice-first mode",
    "Account creation required",
    "Limited moderation — reports are handled manually",
  ],
  betterBecause: [
    "<strong>No download needed.</strong> FaceFrenzy works in any browser on any device. Monkey App requires a mobile app install.",
    "<strong>Works on desktop too.</strong> Use your laptop's bigger screen and better camera. Monkey App is mobile-only.",
    "<strong>Group chat mode.</strong> Chat with 3-4 people simultaneously. Monkey App is 1-on-1 only.",
    "<strong>Blind mode.</strong> Voice-first dating with camera reveal at 30s. Monkey doesn't have this.",
    "<strong>No account required.</strong> Pick a name and start. Monkey App requires account creation.",
    "<strong>AI moderation.</strong> Real-time camera scanning. Monkey relies on manual reports.",
  ],
  faqs: [
    { q: "Is FaceFrenzy better than Monkey App?", a: "FaceFrenzy works in any browser with no download, offers group and blind chat modes, has AI moderation, and requires no account. Monkey App requires a mobile app download, account creation, and is 1-on-1 only." },
    { q: "Can I use FaceFrenzy on desktop?", a: "Yes. FaceFrenzy works on desktop, laptop, tablet, and mobile — any browser with a camera. Monkey App is mobile-only." },
    { q: "Does FaceFrenzy require an app download?", a: "No. FaceFrenzy runs entirely in your browser. Monkey App requires downloading their app from the App Store or Google Play." },
  ],
});

export default VSOmeTV;

// ── Bazoocam ──
export const VSBazoocam = makeVSPage({
  slug: "bazoocam",
  competitor: "Bazoocam",
  competitorUrl: "bazoocam.com",
  title: "Best Bazoocam Alternative — FaceFrenzy",
  subtitle: "Bazoocam is outdated and full of bots. FaceFrenzy is the modern alternative with AI moderation, zero bots, group chat, and blind mode.",
  pageTitle: "Bazoocam Alternative — Better Than Bazoocam? | FaceFrenzy",
  metaDesc: "Looking for a Bazoocam alternative? FaceFrenzy is free random video chat with real people — no bots, AI moderated, 16+, group and blind modes. No signup.",
  whatIs: "Bazoocam (bazoocam.com) is a French random video chat site that launched in 2010. It pairs strangers for webcam chat and added games like Tetris to break the ice. Despite its age, it suffers from bots, minimal moderation, and an outdated interface.",
  problems: [
    "Bots and fake accounts are common — many matches are automated scripts",
    "Outdated interface that hasn't been updated in years",
    "Minimal moderation — explicit content slips through",
    "No age verification — minors can access the site",
    "No group chat or blind mode — 1-on-1 only",
    "No country filtering — matches are random worldwide",
  ],
  betterBecause: [
    "<strong>Zero bots.</strong> FaceFrenzy only matches real, currently connected users. Bazoocam is flooded with bots.",
    "<strong>Modern interface.</strong> Clean, fast, mobile-optimized. Bazoocam looks like 2010.",
    "<strong>AI moderation.</strong> Real-time camera scanning detects inappropriate content automatically. Bazoocam relies on manual reports.",
    "<strong>16+ age gate.</strong> Everyone confirms before entering. Bazoocam has no age verification.",
    "<strong>Group and blind modes.</strong> Chat with 3-4 people or try voice-first blind dating. Bazoocam is 1-on-1 only.",
    "<strong>Country filtering.</strong> Pick a region or chat worldwide. Bazoocam doesn't offer this.",
  ],
  faqs: [
    { q: "Is FaceFrenzy better than Bazoocam?", a: "FaceFrenzy offers zero bots, AI moderation, group chat, blind mode, country filtering, and a modern mobile interface — all free. Bazoocam has an outdated interface, bots, and 1-on-1 only." },
    { q: "Is FaceFrenzy free like Bazoocam?", a: "Yes, FaceFrenzy is completely free with no signup required. Bazoocam is also free but the experience is degraded by bots and lack of moderation." },
    { q: "Does FaceFrenzy have fewer bots than Bazoocam?", a: "FaceFrenzy has zero bots. Every match is a real person currently online. Bazoocam struggles with automated bot accounts." },
  ],
});

// ── Chatspin ──
export const VSChatspin = makeVSPage({
  slug: "chatspin",
  competitor: "Chatspin",
  competitorUrl: "chatspin.com",
  title: "Best Chatspin Alternative — FaceFrenzy",
  subtitle: "Chatspin has a freemium paywall and bots. FaceFrenzy is completely free with AI moderation, group chat, and blind mode.",
  pageTitle: "Chatspin Alternative — Better Than Chatspin? | FaceFrenzy",
  metaDesc: "Looking for a Chatspin alternative? FaceFrenzy is free random video chat with real people — no bots, no paywall, AI moderated, 16+, group and blind modes.",
  whatIs: "Chatspin (chatspin.com) is a random video chat platform that offers both free and premium tiers. It has gender and country filters but locks key features behind a paywall. The free version includes ads and limited functionality.",
  problems: [
    "Freemium model — core features locked behind a paywall",
    "Ads in the free version are intrusive",
    "Bots and fake accounts still appear despite the signup barrier",
    "No group video chat mode",
    "No blind or voice-first mode",
    "Account creation required before chatting",
  ],
  betterBecause: [
    "<strong>Completely free.</strong> No paywall, no premium tier, no ads. Chatspin locks features behind a subscription.",
    "<strong>No signup required.</strong> Pick a name and start chatting instantly. Chatspin requires account creation.",
    "<strong>Zero bots.</strong> Real people only. Chatspin's signup barrier doesn't stop bots.",
    "<strong>Group chat mode.</strong> Chat with 3-4 people at once. Chatspin is 1-on-1 only.",
    "<strong>Blind mode.</strong> Voice-first dating with camera reveal at 30s. Chatspin doesn't have this.",
    "<strong>AI moderation.</strong> Real-time camera scanning. Chatspin relies on manual reports.",
  ],
  faqs: [
    { q: "Is FaceFrenzy better than Chatspin?", a: "FaceFrenzy is completely free with no paywall, no signup, no ads, zero bots, and offers group and blind modes. Chatspin has a freemium model with ads and locked features." },
    { q: "Is FaceFrenzy free like Chatspin?", a: "FaceFrenzy is 100% free with no premium tier. Chatspin's free version has ads and limited features — you need to pay for full access." },
    { q: "Do I need to create an account on FaceFrenzy?", a: "No. Just pick a display name and start chatting. Chatspin requires account creation before you can use the service." },
  ],
});

// ── Chatrandom ──
export const VSChatrandom = makeVSPage({
  slug: "chatrandom",
  competitor: "Chatrandom",
  competitorUrl: "chatrandom.com",
  title: "Best Chatrandom Alternative — FaceFrenzy",
  subtitle: "Chatrandom has bots and a clunky interface. FaceFrenzy is the modern, bot-free alternative with AI moderation and group/blind modes.",
  pageTitle: "Chatrandom Alternative — Better Than Chatrandom? | FaceFrenzy",
  metaDesc: "Looking for a Chatrandom alternative? FaceFrenzy is free random video chat with real people — no bots, AI moderated, 16+, group and blind modes. No signup.",
  whatIs: "Chatrandom (chatrandom.com) is a random video chat site that's been around since 2011. It offers gender and country filters but suffers from bots, an outdated interface, and inconsistent moderation. It also has a premium tier for features that should be free.",
  problems: [
    "Bots are rampant — many matches are automated scripts",
    "Outdated, clunky interface that hasn't kept up with modern design",
    "Premium paywall for features like gender filtering",
    "Inconsistent moderation — explicit content is common",
    "No group chat or blind mode",
    "No AI content moderation — relies on manual reports",
  ],
  betterBecause: [
    "<strong>Zero bots.</strong> Every match on FaceFrenzy is a real person. Chatrandom is flooded with bots.",
    "<strong>Completely free.</strong> No paywall for any feature. Chatrandom locks gender filtering behind a premium subscription.",
    "<strong>Modern interface.</strong> Clean, fast, mobile-optimized. Chatrandom looks dated.",
    "<strong>AI content moderation.</strong> Real-time camera scanning. Chatrandom has minimal moderation.",
    "<strong>Group and blind modes.</strong> Chat with 3-4 people or try voice-first blind dating. Chatrandom is 1-on-1 only.",
    "<strong>16+ age gate.</strong> Everyone confirms their age. Chatrandom's age verification is weak.",
  ],
  faqs: [
    { q: "Is FaceFrenzy better than Chatrandom?", a: "FaceFrenzy offers zero bots, no paywall, AI moderation, group chat, blind mode, and a modern interface — all free. Chatrandom has bots, a premium paywall, and an outdated interface." },
    { q: "Is FaceFrenzy free like Chatrandom?", a: "FaceFrenzy is 100% free with no premium tier. Chatrandom has a freemium model that locks features like gender filtering behind a paywall." },
    { q: "Does FaceFrenzy have fewer bots than Chatrandom?", a: "FaceFrenzy has zero bots. Every match is a real person currently online. Chatrandom struggles with automated bot accounts." },
  ],
});

// ── Shagle ──
export const VSShagle = makeVSPage({
  slug: "shagle",
  competitor: "Shagle",
  competitorUrl: "shagle.com",
  title: "Best Shagle Alternative — FaceFrenzy",
  subtitle: "Shagle has a premium paywall and bots. FaceFrenzy is completely free with AI moderation, group chat, and blind mode.",
  pageTitle: "Shagle Alternative — Better Than Shagle? | FaceFrenzy",
  metaDesc: "Looking for a Shagle alternative? FaceFrenzy is free random video chat with real people — no bots, no paywall, AI moderated, 16+, group and blind modes.",
  whatIs: "Shagle (shagle.com) is a random video chat platform that offers gender and country filters. It has a free tier with limited features and a premium subscription. The free version includes ads and restrictions on filtering.",
  problems: [
    "Premium paywall for gender and country filtering",
    "Ads in the free version are intrusive",
    "Bots and fake accounts still appear",
    "No group video chat mode",
    "No blind or voice-first mode",
    "Inconsistent moderation — reports handled manually",
  ],
  betterBecause: [
    "<strong>Completely free.</strong> No paywall, no premium tier, no ads. Shagle locks filtering behind a subscription.",
    "<strong>Zero bots.</strong> Real people only. Shagle struggles with bots despite its signup barrier.",
    "<strong>Group chat mode.</strong> Chat with 3-4 people at once. Shagle is 1-on-1 only.",
    "<strong>Blind mode.</strong> Voice-first dating with camera reveal at 30s. Shagle doesn't have this.",
    "<strong>AI moderation.</strong> Real-time camera scanning. Shagle relies on manual reports.",
    "<strong>No signup required.</strong> Pick a name and start chatting. Shagle requires account creation for full features.",
  ],
  faqs: [
    { q: "Is FaceFrenzy better than Shagle?", a: "FaceFrenzy is completely free with no paywall, no signup, zero bots, and offers group and blind modes. Shagle has a premium paywall and is 1-on-1 only." },
    { q: "Is FaceFrenzy free like Shagle?", a: "FaceFrenzy is 100% free with no premium tier. Shagle's free version has ads and limited features — you need to pay for gender and country filtering." },
    { q: "Does FaceFrenzy have group chat?", a: "Yes. FaceFrenzy offers group chat with 3-4 people simultaneously. Shagle is 1-on-1 only." },
  ],
});

// ── CamSurf ──
export const VSCamSurf = makeVSPage({
  slug: "camsurf",
  competitor: "CamSurf",
  competitorUrl: "camsurf.com",
  title: "Best CamSurf Alternative — FaceFrenzy",
  subtitle: "CamSurf is limited to 1-on-1 with basic moderation. FaceFrenzy adds AI moderation, group chat, blind mode, and zero bots.",
  pageTitle: "CamSurf Alternative — Better Than CamSurf? | FaceFrenzy",
  metaDesc: "Looking for a CamSurf alternative? FaceFrenzy is free random video chat with real people — no bots, AI moderated, 16+, group and blind modes. No signup.",
  whatIs: "CamSurf (camsurf.com) is a random video chat platform that focuses on a clean, simple experience. It has a mobile app and offers basic filtering. However, it's limited to 1-on-1 chat with manual moderation and no advanced features.",
  problems: [
    "1-on-1 only — no group chat mode",
    "No blind or voice-first mode",
    "Manual moderation — reports are slow to process",
    "Bots and fake accounts still appear",
    "Limited filtering options on the free tier",
    "No AI content moderation",
  ],
  betterBecause: [
    "<strong>Group chat mode.</strong> Chat with 3-4 people at once. CamSurf is 1-on-1 only.",
    "<strong>Blind mode.</strong> Voice-first dating with camera reveal at 30s. CamSurf doesn't have this.",
    "<strong>Zero bots.</strong> Real people only. CamSurf struggles with bots.",
    "<strong>AI moderation.</strong> Real-time camera scanning detects inappropriate content automatically. CamSurf relies on manual reports.",
    "<strong>16+ age gate.</strong> Everyone confirms their age. CamSurf's age verification is weaker.",
    "<strong>Country filtering.</strong> Pick a region or chat worldwide. CamSurf's free filtering is limited.",
  ],
  faqs: [
    { q: "Is FaceFrenzy better than CamSurf?", a: "FaceFrenzy offers group chat, blind mode, AI moderation, zero bots, and country filtering — all free. CamSurf is 1-on-1 only with manual moderation." },
    { q: "Is FaceFrenzy free like CamSurf?", a: "Yes, FaceFrenzy is completely free with no premium tier. CamSurf has a free version but limits filtering options." },
    { q: "Does FaceFrenzy have group chat?", a: "Yes. FaceFrenzy offers group chat with 3-4 people simultaneously. CamSurf is 1-on-1 only." },
  ],
});

// ── Joingy ──
export const VSJoingy = makeVSPage({
  slug: "joingy",
  competitor: "Joingy",
  competitorUrl: "joingy.com",
  title: "Best Joingy Alternative — FaceFrenzy",
  subtitle: "Joingy is text-first with limited video features. FaceFrenzy is video-first with AI moderation, group chat, and blind mode.",
  pageTitle: "Joingy Alternative — Better Than Joingy? | FaceFrenzy",
  metaDesc: "Looking for a Joingy alternative? FaceFrenzy is free random video chat with real people — no bots, AI moderated, 16+, group and blind modes. No signup.",
  whatIs: "Joingy (joingy.com) is a random chat platform that started with text chat and added video later. It's known for its anonymous text chat rooms but has limited video features and basic moderation.",
  problems: [
    "Text-first design — video chat feels like an afterthought",
    "No group video chat mode",
    "No blind or voice-first mode",
    "Basic moderation — no AI content scanning",
    "Bots and spam in text chat rooms",
    "Limited filtering options",
  ],
  betterBecause: [
    "<strong>Video-first design.</strong> FaceFrenzy is built for video chat from the ground up. Joingy's video feels bolted on.",
    "<strong>Group chat mode.</strong> Chat with 3-4 people via video. Joingy is 1-on-1 only.",
    "<strong>Blind mode.</strong> Voice-first dating with camera reveal at 30s. Joingy doesn't have this.",
    "<strong>Zero bots.</strong> Real people only. Joingy's text rooms are full of bots and spam.",
    "<strong>AI moderation.</strong> Real-time camera scanning. Joingy has basic manual moderation.",
    "<strong>16+ age gate.</strong> Everyone confirms their age. Joingy's age verification is minimal.",
  ],
  faqs: [
    { q: "Is FaceFrenzy better than Joingy?", a: "FaceFrenzy is video-first with group chat, blind mode, AI moderation, and zero bots. Joingy is text-first with limited video features and bots in text rooms." },
    { q: "Does FaceFrenzy have text chat?", a: "Yes, FaceFrenzy supports text chat alongside video. But the core experience is video-first, unlike Joingy which is text-first." },
    { q: "Does FaceFrenzy have group chat?", a: "Yes. FaceFrenzy offers group video chat with 3-4 people simultaneously. Joingy is 1-on-1 only." },
  ],
});
