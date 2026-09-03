import { SEOPage, Section, H2, P, UL, LI, FAQ, faqToJson } from "./SEOPage";
import { useEffect } from "react";

const faqs = [
  { q: "Is it safe to talk to strangers online?", a: "On FaceFrenzy, yes. The platform is 16+ age gated and uses AI content moderation that scans camera feeds in real time. You can skip anyone instantly, and inappropriate content is flagged automatically. Unlike unmoderated sites, FaceFrenzy actively removes bad actors." },
  { q: "Can I talk to strangers without a camera?", a: "Yes. FaceFrenzy's Blind mode is voice-first — you talk to your match using only audio for the first 30 seconds. Cameras only reveal if both users choose to continue. You can also turn off your camera at any time during any chat." },
  { q: "How do I start talking to strangers?", a: "Go to facefrenzy.fun, confirm you're 16+, pick a display name, choose a mode (solo, group, or blind), and hit Start Video Chat. You'll be matched with a real person instantly. No signup, no download." },
  { q: "Are the strangers on FaceFrenzy real people?", a: "Yes. FaceFrenzy has zero bots. Every match is a real person currently online and connected to the platform. No fake profiles, no scripted conversations." },
  { q: "Can I choose which country my stranger is from?", a: "Yes. FaceFrenzy lets you filter by region — North America, South America, Europe, Asia, Africa, Oceania — or chat worldwide. You'll only be matched with people in your selected region." },
  { q: "Is talking to strangers free?", a: "Yes, FaceFrenzy is completely free. No signup, no payment, no premium tier. Just open the site and start chatting." },
];

const TalkToStrangers = () => {
  useEffect(() => {
    document.title = "Talk to Strangers — Free Random Video Chat | FaceFrenzy";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Talk to strangers via free random video chat. FaceFrenzy connects you with real people worldwide — no bots, AI moderated, 16+, one-click start. Solo, group, and blind chat modes.");
  }, []);

  return (
    <SEOPage
      title="Talk to Strangers — Free Random Video Chat"
      subtitle="Connect with real people worldwide via random video chat. No bots, no fake profiles, no signup. 16+, AI moderated, one-click start."
      faqSchema={faqToJson(faqs)}
    >
      <Section>
        <H2>Talk to strangers online — safely</H2>
        <P>
          Talking to strangers is one of the most human things you can do online. A random conversation
          can turn into a friendship, a date, a language exchange, or just a moment of connection with
          someone on the other side of the planet. FaceFrenzy makes it instant, safe, and real.
        </P>
        <P>
          Unlike unmoderated chat sites where you're likely to encounter bots, scammers, or explicit
          content, FaceFrenzy is built for genuine human connection. AI moderation runs on every camera
          feed, a 16+ age gate keeps minors out, and every match is a real person — no exceptions.
        </P>
      </Section>

      <Section>
        <H2>Three ways to talk to strangers</H2>
        <UL>
          <LI><strong>Solo mode.</strong> Classic 1-on-1 random video chat. You and a stranger, face to face. Skip to the next person anytime.</LI>
          <LI><strong>Group mode.</strong> Chat with 3-4 people at once. Great for making friends, practicing languages, or just hanging out with strangers who share your vibe.</LI>
          <LI><strong>Blind mode.</strong> Voice-first. You talk to your match using only audio for 30 seconds. If you click, cameras reveal. It's like speed dating, but for voice.</LI>
        </UL>
      </Section>

      <Section>
        <H2>Why talk to strangers on FaceFrenzy?</H2>
        <UL>
          <LI><strong>Real people only.</strong> No bots, no mockups, no fake profiles. Every match is someone currently online.</LI>
          <LI><strong>AI moderated.</strong> Camera feeds are scanned in real time. Inappropriate content is flagged and offenders are banned automatically.</LI>
          <LI><strong>16+ age gated.</strong> Everyone confirms their age. No minors.</LI>
          <LI><strong>Country filtering.</strong> Match with people from a specific region, or go worldwide.</LI>
          <LI><strong>Anonymous.</strong> Pick a display name — no email, no phone number, no account.</LI>
          <LI><strong>Instant.</strong> One click and you're talking to someone new. No waiting, no queues.</LI>
        </UL>
      </Section>

      <Section>
        <H2>Is it safe to talk to strangers online?</H2>
        <P>
          It can be — if you're on the right platform. The danger with most random chat sites is the lack
          of moderation. Bots, scammers, and people sharing explicit content are common on unmoderated
          sites like Chatroulette.
        </P>
        <P>
          FaceFrenzy solves this with three layers of safety:
        </P>
        <UL>
          <LI><strong>AI content moderation</strong> scans every camera feed in real time and flags inappropriate content automatically.</LI>
          <LI><strong>16+ age gate</strong> ensures no minors can access the platform.</LI>
          <LI><strong>Instant skip + report</strong> lets you end any conversation and flag bad actors with one tap.</LI>
        </UL>
        <P>
          You should still use common sense: don't share personal information, don't send money, and
          trust your instincts. If a conversation feels off, skip it.
        </P>
      </Section>

      <Section>
        <H2>Frequently asked questions</H2>
        <FAQ items={faqs} />
      </Section>
    </SEOPage>
  );
};

export default TalkToStrangers;
