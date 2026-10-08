import { SEOPage, Section, H2, P, UL, LI, FAQ, faqToJson } from "./SEOPage";
import { useEffect } from "react";

export default function CamToCamChat() {
  useEffect(() => {
    document.title = "Cam to Cam Chat with Strangers — Free C2C Video Chat | FaceFrenzy";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Free cam to cam chat with strangers — peer-to-peer webcam video, no signup, no app. Instant random matching, AI moderated, 16+. Try FaceFrenzy.");
  }, []);

  const faqs = [
    { q: "What is cam to cam chat?", a: "Both people share their webcam at the same time — you see them live and they see you. On FaceFrenzy it's peer-to-peer, so the video goes directly between you with no server in the middle." },
    { q: "Is cam to cam chat free?", a: "Yes. You get free cam-to-cam matches every day. No signup or payment to start." },
    { q: "Do both people have to turn on their camera?", a: "Solo and group modes are camera-on by default. If you'd rather go audio-first, Blind mode keeps cameras off for the first 30 seconds." },
    { q: "Is the video private?", a: "Your stream goes directly peer-to-peer via encrypted WebRTC — it doesn't pass through or get stored on our servers." },
  ];

  return (
    <SEOPage
      title="Cam to Cam Chat with Strangers — Free & Instant"
      subtitle="Real cam-to-cam video chat: your webcam, their webcam, one tap. Peer-to-peer, encrypted, free — no signup, no app."
      faqSchema={faqToJson(faqs)}
    >
      <Section>
        <H2>Both cameras on, instantly</H2>
        <P>Cam-to-cam is the real deal — not a broadcast, not a profile video. You and a random stranger, both live on webcam, matched in seconds. FaceFrenzy runs it peer-to-peer over WebRTC, so your video goes straight to them with almost zero lag.</P>
      </Section>

      <Section>
        <H2>Why peer-to-peer matters</H2>
        <UL>
          <LI><strong>Near-zero lag.</strong> No server relay means the smoothest possible video.</LI>
          <LI><strong>Real privacy.</strong> The stream is encrypted between you two — we can't watch it even if we wanted to.</LI>
          <LI><strong>No recordings.</strong> Nothing is stored. When the call ends, it's gone.</LI>
        </UL>
      </Section>

      <Section>
        <H2>Pick your format</H2>
        <UL>
          <LI><strong>Solo:</strong> 1-on-1 cam-to-cam — the classic random chat.</LI>
          <LI><strong>Group:</strong> 3-4 cameras in one call — a party, not an interview.</LI>
          <LI><strong>Blind:</strong> Audio first, cameras reveal together at 30 seconds.</LI>
        </UL>
      </Section>

      <Section>
        <H2>Safety on camera</H2>
        <P>Every cam-to-cam session runs through AI moderation that scans video in real time, backed by a 16+ age gate and one-tap skip/report. Bad actors get banned by IP — not just skipped.</P>
      </Section>

      <Section>
        <H2>Frequently asked questions</H2>
        <FAQ items={faqs} />
      </Section>
    </SEOPage>
  );
}
