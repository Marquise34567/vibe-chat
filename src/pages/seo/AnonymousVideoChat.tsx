import { SEOPage, Section, H2, P, UL, LI, FAQ, faqToJson } from "./SEOPage";
import { useEffect } from "react";

export default function AnonymousVideoChat() {
  useEffect(() => {
    document.title = "Anonymous Video Chat — Free, No Signup, No Tracking | FaceFrenzy";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Free anonymous video chat with strangers worldwide. No signup, no email, no tracking. AI moderated, 16+, WebRTC encrypted. Start chatting in seconds.");
  }, []);

  const faqs = [
    { q: "Is FaceFrenzy really anonymous?", a: "Yes. No email, phone number, or real name is required. You pick a display name and start chatting. Your identity stays private." },
    { q: "Does FaceFrenzy track me?", a: "FaceFrenzy does not require an account or personal data to chat. Your video stream goes peer-to-peer via WebRTC — it's not stored on our servers." },
    { q: "Can people find me after the chat ends?", a: "No. When a chat ends, there's no way for the other person to look you up or contact you again. Each match is ephemeral." },
    { q: "Is anonymous video chat safe?", a: "FaceFrenzy makes it as safe as possible with a 16+ age gate, AI content moderation that scans camera feeds in real time, and one-tap reporting on every match." },
  ];

  return (
    <SEOPage
      title="Anonymous Video Chat — Free, No Signup, No Tracking"
      subtitle="Chat with strangers worldwide — 100% anonymous, no account needed. AI moderated, WebRTC encrypted, 16+. Start in seconds."
      faqSchema={faqToJson(faqs)}
    >
      <Section>
        <H2>Truly anonymous video chat</H2>
        <P>Most random video chat sites claim to be anonymous but then ask for your email, phone number, or social login. FaceFrenzy is different. You pick a display name, confirm you're 16+, and start chatting. That's it. No account, no profile, no tracking. Your real identity stays private — the way anonymous chat should be.</P>
      </Section>

      <Section>
        <H2>How your privacy is protected</H2>
        <UL>
          <LI><strong>No signup.</strong> No email, no phone, no social media login. Pick a name and go.</LI>
          <LI><strong>No profile.</strong> There's no profile page, no friends list, no followers. Just chat.</LI>
          <LI><strong>Peer-to-peer video.</strong> Your video stream goes directly to the other person via WebRTC — not through our servers.</LI>
          <LI><strong>No chat logs.</strong> When a chat ends, it's gone. No history, no records.</LI>
          <LI><strong>Ephemeral matches.</strong> The other person can't find you after the chat ends. Each connection is temporary.</LI>
          <LI><strong>One-tap skip.</strong> Don't like the conversation? Hit skip and you're instantly matched with someone new.</LI>
        </UL>
      </Section>

      <Section>
        <H2>Anonymous but safe</H2>
        <P>Anonymous doesn't mean unsafe. FaceFrenzy combines anonymity with real safety features:</P>
        <UL>
          <LI><strong>16+ age gate.</strong> Everyone confirms their age before entering.</LI>
          <LI><strong>AI content moderation.</strong> Camera feeds are scanned in real time. Inappropriate content is flagged automatically.</LI>
          <LI><strong>One-tap reporting.</strong> Report any user instantly. Reports are reviewed quickly.</LI>
          <LI><strong>Zero bots.</strong> Every match is a real person currently online. No scripted conversations.</LI>
        </UL>
      </Section>

      <Section>
        <H2>Three ways to chat anonymously</H2>
        <UL>
          <LI><strong>Solo mode:</strong> 1-on-1 anonymous video chat with a random stranger.</LI>
          <LI><strong>Group mode:</strong> Anonymous group video chat with 3-4 people.</LI>
          <LI><strong>Blind mode:</strong> Voice-first anonymous chat — cameras stay off for 30 seconds while you talk, then reveal.</LI>
        </UL>
      </Section>

      <Section>
        <H2>Frequently asked questions</H2>
        <FAQ items={faqs} />
      </Section>
    </SEOPage>
  );
}
