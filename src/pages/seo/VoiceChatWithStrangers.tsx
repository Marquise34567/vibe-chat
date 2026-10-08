import { SEOPage, Section, H2, P, UL, LI, FAQ, faqToJson } from "./SEOPage";
import { useEffect } from "react";

export default function VoiceChatWithStrangers() {
  useEffect(() => {
    document.title = "Voice Chat with Strangers — Free Random Audio Chat | FaceFrenzy";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Voice chat with random strangers — talk to people worldwide with just your mic. Blind mode keeps cameras off. Free, anonymous, no signup.");
  }, []);

  const faqs = [
    { q: "Can I voice chat without showing my face?", a: "Yes — Blind mode is exactly that: voice-only for the first 30 seconds. You can also turn your camera off in any mode and just talk." },
    { q: "Is voice chat anonymous?", a: "Completely. No account, no real name — just a display name you pick. Strangers hear your voice and nothing else." },
    { q: "Does it work on mobile?", a: "Yes. FaceFrenzy runs in your phone's browser — no app needed. Mic permission is the only thing it asks for." },
    { q: "What if someone is creepy on voice chat?", a: "Hit skip — you're instantly with someone new. You can also report, and AI moderation runs on every call." },
  ];

  return (
    <SEOPage
      title="Voice Chat with Strangers — Random Audio Chat, Free"
      subtitle="No camera? No problem. Voice chat with random people worldwide — anonymous, instant, free. Blind mode keeps it audio-first."
      faqSchema={faqToJson(faqs)}
    >
      <Section>
        <H2>Just your voice — no camera required</H2>
        <P>Sometimes you want to talk to someone new without being on camera. FaceFrenzy's Blind mode is built for exactly that: audio-only conversation with a stranger for the first 30 seconds, with cameras off entirely. Prefer to stay off-camera longer? Turn your camera off and keep talking — voice chat works in every mode.</P>
      </Section>

      <Section>
        <H2>Why voice-first hits different</H2>
        <UL>
          <LI><strong>Zero vanity.</strong> Nobody's checking their own reflection — just talking.</LI>
          <LI><strong>Lower pressure.</strong> Easier to be yourself when nobody's watching.</LI>
          <LI><strong>Late-night friendly.</strong> Chat from bed, lights off, no camera glow.</LI>
          <LI><strong>The reveal option.</strong> In Blind mode, cameras can come on after 30s if you both keep talking.</LI>
        </UL>
      </Section>

      <Section>
        <H2>How to voice chat with a stranger</H2>
        <UL>
          <LI>Open FaceFrenzy in any browser — no app, no signup.</LI>
          <LI>Choose <strong>Blind</strong> mode for guaranteed audio-first.</LI>
          <LI>Talk. Skip anytime. Every match is a new voice.</LI>
        </UL>
      </Section>

      <Section>
        <H2>Frequently asked questions</H2>
        <FAQ items={faqs} />
      </Section>
    </SEOPage>
  );
}
