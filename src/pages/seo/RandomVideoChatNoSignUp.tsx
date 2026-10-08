import { SEOPage, Section, H2, P, UL, LI, FAQ, faqToJson } from "./SEOPage";
import { useEffect } from "react";

export default function RandomVideoChatNoSignUp() {
  useEffect(() => {
    document.title = "Random Video Chat — No Sign Up, No Email, Free | FaceFrenzy";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Random video chat with strangers — no sign up, no email, no download. Free, instant, anonymous. AI moderated, 16+. One tap and you're live.");
  }, []);

  const faqs = [
    { q: "Do I really not need to sign up?", a: "Correct. No email, no phone number, no password. Open the site, tap start, and you're matched with a real person in seconds." },
    { q: "Is it free with no hidden catches?", a: "Yes. You get free matches every day with full video and audio. Optional paid upgrades exist for filters, but chatting is free." },
    { q: "Do I need to download an app?", a: "No. FaceFrenzy runs entirely in your browser — phone, tablet, or computer. Nothing to install, nothing to update." },
    { q: "How is it anonymous without an account?", a: "You pick a display name — that's all anyone sees. There's no profile, no follower list, and no way to look you up after the chat ends." },
  ];

  return (
    <SEOPage
      title="Random Video Chat — No Sign Up, No Email, No App"
      subtitle="The fastest way to video chat with strangers. No account, no download, no waiting. Tap start and you're live in seconds."
      faqSchema={faqToJson(faqs)}
    >
      <Section>
        <H2>Zero friction — just chat</H2>
        <P>Most random video chat sites make you create an account, verify an email, or download an app before you can talk to anyone. FaceFrenzy skips all of it. There's no registration wall — you confirm you're 16+, pick a display name, and hit start. Your first match happens in seconds, not minutes.</P>
      </Section>

      <Section>
        <H2>What "no sign up" actually means here</H2>
        <UL>
          <LI><strong>No email required.</strong> We never ask for it, so it can never leak.</LI>
          <LI><strong>No password.</strong> Nothing to remember, nothing to steal.</LI>
          <LI><strong>No app download.</strong> Works in Chrome, Safari, Firefox — on any device.</LI>
          <LI><strong>No profile.</strong> No bio, no followers, no history. Every chat is ephemeral.</LI>
          <LI><strong>Instant matching.</strong> Tap the button, get matched, see them on camera.</LI>
        </UL>
      </Section>

      <Section>
        <H2>Three ways to jump in</H2>
        <UL>
          <LI><strong>Solo:</strong> Classic 1-on-1 random video chat — the Omegle experience, without the bots.</LI>
          <LI><strong>Group:</strong> 3-4 way video chat with strangers — a party, not just a call.</LI>
          <LI><strong>Blind:</strong> Voice-first chat. Cameras stay off for 30 seconds so you talk before you judge.</LI>
        </UL>
      </Section>

      <Section>
        <H2>Safe without an account</H2>
        <P>No signup doesn't mean no rules. Every chat is protected by AI content moderation that scans video in real time, a 16+ age gate, and a one-tap skip/report on every match. It's anonymous for you — and accountable for bad actors.</P>
      </Section>

      <Section>
        <H2>Frequently asked questions</H2>
        <FAQ items={faqs} />
      </Section>
    </SEOPage>
  );
}
