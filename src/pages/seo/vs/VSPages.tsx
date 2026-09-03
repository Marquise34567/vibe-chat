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
