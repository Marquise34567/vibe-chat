import { SEOPage, Section, H2, P, UL, LI, FAQ, faqToJson } from "../seo/SEOPage";
import { useEffect } from "react";

const faqs = [
  { q: "Is there an Omegle alternative with no signup?", a: "Yes. FaceFrenzy requires no signup — just pick a display name and start chatting. No email, no phone number, no account creation. It's the closest to the original Omegle experience." },
  { q: "Can I video chat without registering?", a: "Yes. FaceFrenzy lets you video chat with strangers without any registration. Pick a name, allow your camera, and you're matched instantly." },
  { q: "Is no-signup video chat safe?", a: "It can be. FaceFrenzy combines no-signup convenience with real safety: 16+ age gate, AI content moderation, zero bots, and one-tap reporting. No signup doesn't mean no safety." },
  { q: "Why do other Omegle alternatives require signup?", a: "Most alternatives (Chatspin, Shagle, Emerald Chat) require accounts to monetize premium features and reduce spam. But signup barriers don't stop bots — they just add friction for real users. FaceFrenzy prevents bots through its matching system, not through signup walls." },
];

export default function OmegleAlternativeNoSignup() {
  useEffect(() => {
    document.title = "Omegle Alternative No Signup — Free Video Chat Without Registration | FaceFrenzy";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Omegle alternative with no signup required. Free random video chat without registration — no email, no account. AI moderated, 16+, zero bots. Start in seconds.");
  }, []);

  return (
    <SEOPage
      title="Omegle Alternative No Signup — Free Video Chat Without Registration"
      subtitle="The best Omegle alternative that doesn't require signup. No email, no account, no download. Pick a name and start chatting instantly."
      faqSchema={faqToJson(faqs)}
    >
      <Section>
        <H2>Omegle alternative with no signup required</H2>
        <P>One of the best things about Omegle was that you didn't need an account — you just showed up and started chatting. Most Omegle alternatives lost this, requiring email signup, account creation, or even payment before you can chat. FaceFrenzy brings back the no-signup experience: pick a display name, confirm you're 16+, allow your camera, and you're matched with a stranger in seconds.</P>
      </Section>

      <Section>
        <H2>Why no signup is better</H2>
        <UL>
          <LI><strong>Instant access.</strong> No forms, no email verification, no waiting. You're chatting in under 10 seconds.</LI>
          <LI><strong>Better privacy.</strong> No account means no data to leak. Your identity stays private.</LI>
          <LI><strong>Less friction.</strong> Signup walls kill spontaneity. Random chat should be instant, not a registration process.</LI>
          <LI><strong>Signup doesn't stop bots anyway.</strong> Bots create accounts too. FaceFrenzy prevents bots through its matching system, not through signup barriers.</LI>
        </UL>
      </Section>

      <Section>
        <H2>How FaceFrenzy stays safe without signup</H2>
        <P>You might think no-signup means no safety. It doesn't. FaceFrenzy combines no-signup convenience with real safety features:</P>
        <UL>
          <LI><strong>16+ age gate.</strong> Everyone confirms their age before entering — no account needed for this.</LI>
          <LI><strong>AI content moderation.</strong> Camera feeds are scanned in real time. Inappropriate content is flagged automatically.</LI>
          <LI><strong>Zero bots.</strong> FaceFrenzy only matches real, currently connected users. No scripted conversations.</LI>
          <LI><strong>One-tap reporting.</strong> Report any user instantly without leaving the chat.</LI>
          <LI><strong>Ephemeral matches.</strong> When a chat ends, it's gone. The other person can't find you.</LI>
        </UL>
      </Section>

      <Section>
        <H2>How it works — 3 steps, no signup</H2>
        <UL>
          <LI><strong>1. Pick a name.</strong> Choose any display name. No email, no password, no verification.</LI>
          <LI><strong>2. Allow your camera.</strong> Your browser asks for camera and mic access. Your stream goes peer-to-peer via WebRTC.</LI>
          <LI><strong>3. Start chatting.</strong> Click Start and you're matched with a random stranger instantly. Skip anytime.</LI>
        </UL>
      </Section>

      <Section>
        <H2>Which Omegle alternatives require signup?</H2>
        <P>Most alternatives now require account creation, which kills the spontaneity that made Omegle great:</P>
        <UL>
          <LI><strong>Emerald Chat</strong> — requires account creation before you can chat</LI>
          <LI><strong>Chatspin</strong> — requires signup, with a freemium paywall</LI>
          <LI><strong>Shagle</strong> — requires account for full features</LI>
          <LI><strong>Monkey App</strong> — requires app download and account</LI>
        </UL>
        <P>FaceFrenzy is the only major alternative that keeps the no-signup experience while adding modern safety features.</P>
      </Section>

      <Section>
        <H2>Frequently asked questions</H2>
        <FAQ items={faqs} />
      </Section>
    </SEOPage>
  );
}
