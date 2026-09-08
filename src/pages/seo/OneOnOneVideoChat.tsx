import { SEOPage, Section, H2, P, UL, LI, FAQ, faqToJson } from "./SEOPage";
import { useEffect } from "react";

export default function OneOnOneVideoChat() {
  useEffect(() => {
    document.title = "1v1 Video Chat — Free 1-on-1 Random Video Call | FaceFrenzy";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Free 1v1 video chat with random strangers. No signup, no bots, AI moderated. 1-on-1 random video call in seconds. 16+, HD quality, works in browser.");
  }, []);

  const faqs = [
    { q: "What is 1v1 video chat?", a: "1v1 video chat (also called 1-on-1 video chat) is a live video conversation between two people. On FaceFrenzy, you're matched with a random stranger for a 1-on-1 video call. You can skip to a new person anytime." },
    { q: "Is FaceFrenzy's 1v1 video chat free?", a: "Yes. 1v1 video chat on FaceFrenzy is 100% free with no signup, no paywall, and no ads. Just pick a name and start." },
    { q: "Is 1v1 video chat safe?", a: "FaceFrenzy makes 1v1 video chat as safe as possible with a 16+ age gate, AI content moderation that scans camera feeds in real time, zero bots, and one-tap reporting." },
    { q: "Can I do 1v1 video chat on mobile?", a: "Yes. FaceFrenzy works in any mobile browser. No app download needed — just open the site and start chatting." },
  ];

  return (
    <SEOPage
      title="1v1 Video Chat — Free 1-on-1 Random Video Call"
      subtitle="Free 1v1 video chat with random strangers. No bots, no signup, AI moderated. Start a 1-on-1 random video call in seconds. 16+, HD quality."
      faqSchema={faqToJson(faqs)}
    >
      <Section>
        <H2>1-on-1 video chat with real strangers</H2>
        <P>1v1 video chat is the core FaceFrenzy experience — you're matched with one random stranger for a live, face-to-face video conversation. No group, no audience, just you and one other person. It's the classic Omegle format, but with zero bots, AI moderation, and a 16+ age gate that keeps the platform safe and clean.</P>
      </Section>

      <Section>
        <H2>Why FaceFrenzy is the best 1v1 video chat</H2>
        <UL>
          <LI><strong>Zero bots.</strong> Every 1v1 match is a real person currently online. No scripted conversations.</LI>
          <LI><strong>AI moderation.</strong> Camera feeds are scanned in real time to keep the platform safe.</LI>
          <LI><strong>16+ age gate.</strong> Everyone confirms their age. No minors allowed.</LI>
          <LI><strong>No signup.</strong> Pick a display name and start. No email, no account, no download.</LI>
          <LI><strong>HD video quality.</strong> WebRTC peer-to-peer video means crystal-clear quality with zero lag.</LI>
          <LI><strong>Instant skip.</strong> Don't like the conversation? Hit skip and you're matched with someone new instantly.</LI>
          <LI><strong>Country filtering.</strong> Chat with people from specific regions or go fully random worldwide.</LI>
        </UL>
      </Section>

      <Section>
        <H2>How 1v1 video chat works</H2>
        <UL>
          <LI><strong>1. Pick a name.</strong> Choose a display name — no account needed.</LI>
          <LI><strong>2. Allow your camera.</strong> Your browser asks for camera and mic access. Your stream goes peer-to-peer — never stored.</LI>
          <LI><strong>3. Start matching.</strong> Click Start and you're matched with a random stranger in seconds.</LI>
          <LI><strong>4. Chat or skip.</strong> Have a conversation, or hit skip to meet someone new. It's that simple.</LI>
        </UL>
      </Section>

      <Section>
        <H2>More than just 1v1</H2>
        <P>While 1v1 is the classic format, FaceFrenzy also offers two more modes:</P>
        <UL>
          <LI><strong>Group mode:</strong> Video chat with 3-4 people simultaneously in a dynamic grid layout.</LI>
          <LI><strong>Blind mode:</strong> Voice-first 1v1 — cameras stay off for 30 seconds while you talk, then reveal.</LI>
        </UL>
      </Section>

      <Section>
        <H2>Frequently asked questions</H2>
        <FAQ items={faqs} />
      </Section>
    </SEOPage>
  );
}
