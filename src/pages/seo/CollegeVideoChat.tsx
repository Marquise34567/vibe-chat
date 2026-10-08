import { SEOPage, Section, H2, P, UL, LI, FAQ, faqToJson } from "./SEOPage";
import { useEffect } from "react";

export default function CollegeVideoChat() {
  useEffect(() => {
    document.title = "College Video Chat — Random Video Chat for Students | FaceFrenzy";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Random video chat for college students — meet students from other universities, use the scholar filter, free and no signup. FaceFrenzy scholar mode.");
  }, []);

  const faqs = [
    { q: "Can I only match with other students?", a: "Yes — turn on Scholar mode to filter matches toward verified students. Free users can also just chat normally with everyone." },
    { q: "Which universities use FaceFrenzy?", a: "Students from campuses worldwide — it's random matching, so every call can be a different school in a different country." },
    { q: "Is it free for students?", a: "Yes. You get free matches every day. Plus and VIP unlock extras like gender and region filters, but chatting itself is free." },
    { q: "Do I need my .edu email?", a: "No email is required at all to start chatting — not even a .edu one." },
  ];

  return (
    <SEOPage
      title="College Video Chat — Meet Students from Other Universities"
      subtitle="Random video chat for students. Meet people from other campuses worldwide, turn on Scholar mode to filter for students, no signup needed."
      faqSchema={faqToJson(faqs)}
    >
      <Section>
        <H2>Meet students outside your bubble</H2>
        <P>Your campus is thousands of people you already kind of know. FaceFrenzy drops you into video chats with students from universities you've never heard of — different countries, different majors, different everything. Ten free matches a day, straight from your dorm.</P>
      </Section>

      <Section>
        <H2>Scholar mode — students only</H2>
        <P>Flip on the Scholar filter and matching prioritizes verified students. Scholar badges show up on the video tile so you know you're talking to a real student, not someone pretending.</P>
      </Section>

      <Section>
        <H2>Why students use it</H2>
        <UL>
          <LI><strong>Study breaks.</strong> Ten minutes between classes turns into a conversation with someone in Tokyo or São Paulo.</LI>
          <LI><strong>Dating pool overflow.</strong> Meet people outside your campus gossip network — no mutual friends watching.</LI>
          <LI><strong>Practice languages.</strong> Match with native speakers and actually talk instead of flashcards.</LI>
          <LI><strong>Group mode.</strong> 3-4 way calls feel like a dorm common room.</LI>
          <LI><strong>Games built in.</strong> Play Uno or Tic-Tac-Toe with your match mid-call.</LI>
        </UL>
      </Section>

      <Section>
        <H2>Safe for campus life</H2>
        <P>16+ age gate, AI camera moderation, and one-tap skip/report on every match. Anonymous by default — nobody can look you up after the call ends.</P>
      </Section>

      <Section>
        <H2>Frequently asked questions</H2>
        <FAQ items={faqs} />
      </Section>
    </SEOPage>
  );
}
