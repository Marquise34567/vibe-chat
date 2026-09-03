import { SEOPage, Section, H2, P, UL, LI, FAQ, faqToJson } from "./SEOPage";
import { useEffect } from "react";

const faqs = [
  { q: "Is FaceFrenzy a safe Omegle alternative?", a: "Yes. FaceFrenzy is the safest Omegle alternative because it combines a 16+ age gate, AI content moderation that scans camera feeds in real time, zero-bot matching, and instant skip/report. Unlike Chatroulette or OmeTV, FaceFrenzy actively prevents inappropriate content before it reaches you." },
  { q: "How does AI moderation work?", a: "FaceFrenzy scans camera frames at regular intervals using content classification models. If a frame is flagged as inappropriate (NSFW, violence, etc.), the user receives a warning. Multiple violations result in an automatic ban. This happens in real time without human reviewers." },
  { q: "Does FaceFrenzy allow minors?", a: "No. FaceFrenzy is strictly 16+. Every visitor must confirm their age before entering. This is enforced via an age gate on first visit." },
  { q: "What should I do if someone is inappropriate?", a: "Tap the skip button to end the conversation immediately. You can also tap the report flag to alert the moderation system. AI moderation will likely have already flagged the user before you report them." },
  { q: "Is my video private?", a: "Video is peer-to-peer via WebRTC — it goes directly between you and your match, not through a server. FaceFrenzy does not record or store video feeds. AI moderation scans frames locally and only sends classification results, not raw video." },
  { q: "Does FaceFrenzy have bots?", a: "No. FaceFrenzy has zero bots. Every match is a real person currently connected to the platform. No fake profiles, no scripted conversations." },
];

const Safety = () => {
  useEffect(() => {
    document.title = "Safe Omegle Alternative — AI Moderation & 16+ Age Gate | FaceFrenzy";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "FaceFrenzy is the safest Omegle alternative. AI content moderation scans every camera feed, 16+ age gate, zero bots, instant skip and report. Free random video chat that's actually safe.");
  }, []);

  return (
    <SEOPage
      title="Safe Random Video Chat — AI Moderated, 16+"
      subtitle="FaceFrenzy is the safest Omegle alternative. AI content moderation, 16+ age gate, zero bots, and instant reporting. Free random video chat that's actually safe."
      faqSchema={faqToJson(faqs)}
    >
      <Section>
        <H2>Safety is the #1 feature</H2>
        <P>
          Most random video chat sites are unsafe. Chatroulette has no age gate and minimal moderation.
          OmeTV relies on slow manual reports. Bots and explicit content are everywhere. That's why
          people stopped trusting the format.
        </P>
        <P>
          FaceFrenzy was built differently. Safety isn't an afterthought — it's the core product.
          Here's how we keep random video chat safe:
        </P>
      </Section>

      <Section>
        <H2>Three layers of protection</H2>
        <UL>
          <LI><strong>AI content moderation.</strong> Every camera feed is scanned in real time. If someone exposes themselves or shows inappropriate content, the AI flags it instantly. Warnings are issued automatically. Repeat offenders are banned — no waiting for a human moderator.</LI>
          <LI><strong>16+ age gate.</strong> Every visitor confirms they are 16 or older before they can enter the platform. No minors, no exceptions. This is the first thing you see — before any chat or camera access.</LI>
          <LI><strong>Zero bots.</strong> Every match is a real person currently online. No bot accounts, no fake profiles, no scripted conversations. Bots are the #1 way scammers and bad actors infiltrate chat platforms — FaceFrenzy eliminates them entirely.</LI>
        </UL>
      </Section>

      <Section>
        <H2>How AI moderation works</H2>
        <P>
          FaceFrenzy uses content classification models that scan camera frames at regular intervals.
          Here's the process:
        </P>
        <UL>
          <LI>Frames are captured from both the local and remote camera feeds</LI>
          <LI>Each frame is classified for inappropriate content (NSFW, violence, etc.)</LI>
          <LI>If flagged, the user receives an automatic warning</LI>
          <LI>Multiple violations trigger an automatic ban (typically 3 strikes)</LI>
          <LI>Bans are IP-based and last 24 hours for first offenses</LI>
        </UL>
        <P>
          This all happens in real time — before someone has to hit "report." The AI catches what
          manual moderation misses, and it catches it faster.
        </P>
      </Section>

      <Section>
        <H2>Your privacy</H2>
        <UL>
          <LI><strong>Peer-to-peer video.</strong> Video goes directly between you and your match via WebRTC. It doesn't pass through our servers.</LI>
          <LI><strong>No video recording.</strong> FaceFrenzy does not record, store, or replay video feeds.</LI>
          <LI><strong>No personal data required.</strong> Pick a display name and chat. No email, no phone, no account.</LI>
          <LI><strong>AI scans are local.</strong> Moderation sends classification results, not raw video, to the server.</LI>
        </UL>
      </Section>

      <Section>
        <H2>Tips for staying safe</H2>
        <UL>
          <LI>Don't share personal information — real name, address, phone number, social media</LI>
          <LI>Don't send money or gift cards to anyone you meet</LI>
          <LI>Trust your instincts — if a conversation feels off, skip it</LI>
          <LI>Use the report button for anyone who is inappropriate</LI>
          <LI>Keep your camera framing appropriate — AI moderation applies to you too</LI>
        </UL>
      </Section>

      <Section>
        <H2>Frequently asked questions</H2>
        <FAQ items={faqs} />
      </Section>
    </SEOPage>
  );
};

export default Safety;
