import { SEOPage, Section, H2, P, UL, LI, FAQ, faqToJson } from "./SEOPage";
import { useEffect } from "react";

export default function BlindDateVideoChat() {
  useEffect(() => {
    document.title = "Blind Date Video Chat — Voice First, Cameras Reveal at 30s | FaceFrenzy";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Blind date video chat with strangers — audio only for 30 seconds, then cameras reveal. Talk first, judge later. Free, no signup, AI moderated.");
  }, []);

  const faqs = [
    { q: "How does blind mode work?", a: "You match with a stranger and talk audio-only for 30 seconds. When the timer hits zero, both cameras reveal at the same time. Nobody sees anyone until the reveal." },
    { q: "Can I skip before the reveal?", a: "Yes — you can skip at any point, before or after the reveal." },
    { q: "Is blind mode free?", a: "Yes, it counts as a normal match. Same free daily matches as solo mode." },
    { q: "What if the other person turns their camera on early?", a: "They can't — cameras only activate at the reveal for both sides at once. It's genuinely blind." },
  ];

  return (
    <SEOPage
      title="Blind Date Video Chat — Voice First, Reveal at 30 Seconds"
      subtitle="A blind date with a stranger, every match. Audio only for 30 seconds — then both cameras reveal at once. Talk first, judge later."
      faqSchema={faqToJson(faqs)}
    >
      <Section>
        <H2>Personality first, face second</H2>
        <P>Regular video chat is a looks contest decided in half a second. Blind mode flips it: you get 30 seconds of voice-only conversation before either camera turns on. By the time you see them, you already know if they're funny. It's the closest thing to a real blind date the internet has.</P>
      </Section>

      <Section>
        <H2>How a blind match works</H2>
        <UL>
          <LI>Pick <strong>Blind</strong> mode and match with a stranger.</LI>
          <LI>Talk audio-only for 30 seconds — a countdown shows when the reveal happens.</LI>
          <LI>Both cameras reveal at exactly the same moment. Nobody gets a sneak peek.</LI>
          <LI>Like the vibe? Extend the chat. Not feeling it? Skip like normal.</LI>
        </UL>
      </Section>

      <Section>
        <H2>Why people love blind mode</H2>
        <UL>
          <LI><strong>Less anxiety.</strong> Easier to open up when nobody's watching you yet.</LI>
          <LI><strong>Less snap-judging.</strong> 30 seconds of real conversation before appearance enters it.</LI>
          <LI><strong>The reveal is fun.</strong> That shared countdown moment is genuinely exciting.</LI>
          <LI><strong>Same safety.</strong> AI moderation and one-tap skip/report apply from second zero.</LI>
        </UL>
      </Section>

      <Section>
        <H2>Frequently asked questions</H2>
        <FAQ items={faqs} />
      </Section>
    </SEOPage>
  );
}
