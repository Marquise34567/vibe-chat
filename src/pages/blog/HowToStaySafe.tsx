import { SEOPage, Section, H2, P, UL, LI, FAQ, faqToJson } from "../seo/SEOPage";
import { useEffect } from "react";

const faqs = [
  { q: "Is random video chat safe?", a: "It can be. The key is choosing a platform with real safety features: age verification, AI content moderation, reporting tools, and zero bots. FaceFrenzy has all of these. Platforms like Chatroulette and Bazoocam do not." },
  { q: "How do I protect my privacy on random video chat?", a: "Use a platform that doesn't require signup (like FaceFrenzy), don't share personal information, don't reveal your real name or location, and use the skip button if someone makes you uncomfortable. Your video stream on FaceFrenzy goes peer-to-peer and is never stored." },
  { q: "What should I do if someone is inappropriate on video chat?", a: "Hit the skip button immediately to end the match, then use the report button. On FaceFrenzy, AI moderation also scans camera feeds in real time and flags inappropriate content automatically." },
  { q: "Can people record me on random video chat?", a: "Technically, someone could screen-record. To minimize risk, use a platform with AI moderation (which deters bad behavior), don't share personal information, and skip anyone who makes you uncomfortable. FaceFrenzy's ephemeral matches mean the other person can't find you after the chat ends." },
];

export default function HowToStaySafe() {
  useEffect(() => {
    document.title = "How to Stay Safe on Random Video Chat (2026 Guide) | FaceFrenzy";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "How to stay safe on random video chat in 2026. Privacy tips, red flags to watch for, and how to choose a safe platform. Complete safety guide from FaceFrenzy.");
  }, []);

  return (
    <SEOPage
      title="How to Stay Safe on Random Video Chat"
      subtitle="A complete guide to protecting your privacy and staying safe while using random video chat sites in 2026."
      faqSchema={faqToJson(faqs)}
    >
      <Section>
        <H2>Random video chat can be safe — if you do it right</H2>
        <P>Random video chat is fun, spontaneous, and a great way to meet new people. But it comes with risks — inappropriate content, privacy concerns, and bots. The good news: most of these risks are avoidable if you choose the right platform and follow a few simple rules.</P>
      </Section>

      <Section>
        <H2>1. Choose a platform with real safety features</H2>
        <P>The single most important thing you can do is pick a platform that takes safety seriously. Look for:</P>
        <UL>
          <LI><strong>Age verification.</strong> A real age gate keeps minors out. FaceFrenzy requires 16+ confirmation.</LI>
          <LI><strong>AI content moderation.</strong> Camera feeds should be scanned in real time, not just relying on user reports. FaceFrenzy does this.</LI>
          <LI><strong>Zero bots.</strong> Bots waste your time and can be used for scams. FaceFrenzy only matches real people.</LI>
          <LI><strong>One-tap reporting.</strong> You should be able to report someone instantly, without leaving the chat.</LI>
          <LI><strong>No signup required.</strong> Platforms that don't require accounts can't store your data.</LI>
        </UL>
      </Section>

      <Section>
        <H2>2. Protect your privacy</H2>
        <UL>
          <LI><strong>Don't share your real name.</strong> Use a display name, not your actual name.</LI>
          <LI><strong>Don't reveal your location.</strong> Don't mention your city, school, or workplace.</LI>
          <LI><strong>Don't share contact info.</strong> No phone numbers, social media handles, or email addresses.</LI>
          <LI><strong>Be aware of your background.</strong> Your camera shows what's behind you. Don't have identifying information visible.</LI>
          <LI><strong>Use a platform with peer-to-peer video.</strong> FaceFrenzy uses WebRTC — your video goes directly to the other person, not through a server where it could be stored.</LI>
        </UL>
      </Section>

      <Section>
        <H2>3. Red flags to watch for</H2>
        <P>Skip immediately if you notice any of these:</P>
        <UL>
          <LI>Someone asks for personal information (name, age, location, contact info)</LI>
          <LI>Someone asks you to switch to another app or platform</LI>
          <LI>Someone asks for money or tries to sell you something</LI>
          <LI>The video looks pre-recorded or loops (likely a bot)</LI>
          <LI>Someone is pressuring you to do something you're not comfortable with</LI>
          <LI>The person's behavior changes dramatically after you reveal something about yourself</LI>
        </UL>
      </Section>

      <Section>
        <H2>4. What to do if something goes wrong</H2>
        <UL>
          <LI><strong>Skip.</strong> Hit the skip button. You're instantly matched with someone new.</LI>
          <LI><strong>Report.</strong> Use the report button to flag the user. On FaceFrenzy, reports are reviewed quickly.</LI>
          <LI><strong>Don't engage.</strong> Don't argue or try to reason with someone inappropriate. Just leave.</LI>
          <LI><strong>Take a break.</strong> If you're feeling uncomfortable, close the tab and come back later.</LI>
        </UL>
      </Section>

      <Section>
        <H2>Why FaceFrenzy is the safest random video chat</H2>
        <UL>
          <LI><strong>16+ age gate</strong> — everyone confirms their age before entering</LI>
          <LI><strong>AI content moderation</strong> — camera feeds scanned in real time</LI>
          <LI><strong>Zero bots</strong> — every match is a real person currently online</LI>
          <LI><strong>No signup</strong> — no email, no phone, no data stored</LI>
          <LI><strong>Peer-to-peer video</strong> — your stream goes directly to the other person, not through servers</LI>
          <LI><strong>Ephemeral matches</strong> — the other person can't find you after the chat ends</LI>
          <LI><strong>One-tap reporting</strong> — report any user instantly</LI>
        </UL>
      </Section>

      <Section>
        <H2>Frequently asked questions</H2>
        <FAQ items={faqs} />
      </Section>
    </SEOPage>
  );
}
