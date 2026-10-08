import { SEOPage, Section, H2, P, UL, LI, FAQ, faqToJson } from "./SEOPage";
import { useEffect } from "react";

export default function GroupVideoChatStrangers() {
  useEffect(() => {
    document.title = "Group Video Chat with Strangers — Free Random Group Calls | FaceFrenzy";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Group video chat with strangers — 3-4 random people in one call, free and instant. No signup. Omegle-style matching but for groups. Try FaceFrenzy group mode.");
  }, []);

  const faqs = [
    { q: "How many people are in a group chat?", a: "Group mode matches 3-4 people into one video call. The tile layout adapts automatically to however many people join." },
    { q: "Is group video chat free?", a: "Yes. Group mode is included in your free daily matches, same as solo mode." },
    { q: "Can I skip a group I don't like?", a: "Absolutely. One tap on skip and you're instantly matched into a new group — no awkward goodbyes." },
    { q: "Is it moderated?", a: "Yes. The same AI moderation that covers 1-on-1 chat runs on group calls too, plus a 16+ age gate and one-tap reporting." },
  ];

  return (
    <SEOPage
      title="Group Video Chat with Strangers — Random Group Calls"
      subtitle="Why settle for one stranger? FaceFrenzy group mode drops 3-4 random people into one video call. Free, instant, no signup."
      faqSchema={faqToJson(faqs)}
    >
      <Section>
        <H2>Random chat, but with a crowd</H2>
        <P>Omegle gave you one stranger. FaceFrenzy group mode gives you a whole table. Three or four random people, one video call, zero signup. It's the difference between an interview and a party — someone always has something to say, and the energy never drops.</P>
      </Section>

      <Section>
        <H2>Why group beats 1-on-1</H2>
        <UL>
          <LI><strong>No awkward silence.</strong> With 3-4 people, someone always fills the gap.</LI>
          <LI><strong>Less pressure.</strong> You're not carrying the whole conversation alone.</LI>
          <LI><strong>More perspectives.</strong> Meet people from different countries in one call.</LI>
          <LI><strong>Games hit harder.</strong> Built-in games like Uno and Would You Rather are better with a group.</LI>
          <LI><strong>Safer by default.</strong> Bad behavior is harder to pull off in a crowd — and every feed is AI moderated.</LI>
        </UL>
      </Section>

      <Section>
        <H2>How group matching works</H2>
        <UL>
          <LI>Pick <strong>Group</strong> mode on the start screen.</LI>
          <LI>We drop you into a call with 3-4 random people who are online right now.</LI>
          <LI>The video layout adapts — everyone gets a tile, nobody gets cut off.</LI>
          <LI>Don't vibe with the group? Skip once, land in a new one.</LI>
        </UL>
      </Section>

      <Section>
        <H2>Almost nobody else does this</H2>
        <P>Most Omegle alternatives are 1-on-1 only. Group random video chat is rare — and it's the mode people stay on longest. If you bounce off awkward one-on-one silences, group mode is the fix.</P>
      </Section>

      <Section>
        <H2>Frequently asked questions</H2>
        <FAQ items={faqs} />
      </Section>
    </SEOPage>
  );
}
