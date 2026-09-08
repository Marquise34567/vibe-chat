import { SEOPage, Section, H2, P, UL, LI, FAQ, faqToJson } from "./SEOPage";
import { useEffect } from "react";

export default function RandomCamChat() {
  useEffect(() => {
    document.title = "Random Cam Chat — Free Webcam Chat with Strangers | FaceFrenzy";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Free random cam chat with strangers worldwide. No signup, no bots, AI moderated. Webcam chat with real people in seconds. 16+, group and blind modes.");
  }, []);

  const faqs = [
    { q: "What is random cam chat?", a: "Random cam chat is a video chat format where you're matched with a random stranger for a live webcam conversation. You can skip to a new person anytime. FaceFrenzy is the modern, bot-free version of this experience." },
    { q: "Do I need a webcam to use FaceFrenzy?", a: "For video chat modes, yes — you need a camera. But FaceFrenzy also has blind mode where cameras stay off for the first 30 seconds, so you can start with voice only." },
    { q: "Is random cam chat safe on FaceFrenzy?", a: "Yes. FaceFrenzy has a 16+ age gate, AI content moderation that scans camera feeds in real time, zero bots, and one-tap reporting. It's the safest random cam chat experience available." },
    { q: "Can I filter who I match with?", a: "Yes. FaceFrenzy offers country filtering so you can chat with people from specific regions, or go fully random worldwide." },
  ];

  return (
    <SEOPage
      title="Random Cam Chat — Free Webcam Chat with Strangers"
      subtitle="Free random cam chat with real people worldwide. No bots, no signup, AI moderated. Start a webcam chat with a stranger in seconds."
      faqSchema={faqToJson(faqs)}
    >
      <Section>
        <H2>Random cam chat with real people</H2>
        <P>Random cam chat is the classic Omegle experience — turn on your webcam, get matched with a stranger, and start talking. FaceFrenzy brings this experience back but without the problems that plagued Omegle: no bots, AI-powered moderation, a 16+ age gate, and features Omegle never had like group chat and blind mode.</P>
      </Section>

      <Section>
        <H2>Why FaceFrenzy is the best random cam chat</H2>
        <UL>
          <LI><strong>Zero bots.</strong> Every match is a real person currently online. No scripted conversations, no fake webcams.</LI>
          <LI><strong>AI moderation.</strong> Camera feeds are scanned in real time to detect and block inappropriate content.</LI>
          <LI><strong>16+ age gate.</strong> Everyone confirms their age before entering. No minors allowed.</LI>
          <LI><strong>No signup.</strong> Pick a display name and start. No email, no account, no download.</LI>
          <LI><strong>Country filtering.</strong> Chat with people from specific regions or go fully random worldwide.</LI>
          <LI><strong>HD video.</strong> WebRTC peer-to-peer video means crystal-clear quality with zero lag.</LI>
        </UL>
      </Section>

      <Section>
        <H2>How random cam chat works</H2>
        <P>It's simple — three steps and you're chatting:</P>
        <UL>
          <LI><strong>1. Pick a name.</strong> Choose a display name. No account needed.</LI>
          <LI><strong>2. Allow your camera.</strong> Your browser will ask for camera and mic access. Your stream goes peer-to-peer — never stored.</LI>
          <LI><strong>3. Start matching.</strong> Click Start and you're matched with a random stranger in seconds. Don't like the conversation? Hit skip.</LI>
        </UL>
      </Section>

      <Section>
        <H2>Three cam chat modes</H2>
        <UL>
          <LI><strong>Solo mode:</strong> Classic 1-on-1 random cam chat — the Omegle experience, but better.</LI>
          <LI><strong>Group mode:</strong> Cam chat with 3-4 people in a dynamic video grid layout.</LI>
          <LI><strong>Blind mode:</strong> Voice-first — cameras stay off for 30 seconds while you talk, then reveal.</LI>
        </UL>
      </Section>

      <Section>
        <H2>Frequently asked questions</H2>
        <FAQ items={faqs} />
      </Section>
    </SEOPage>
  );
}
