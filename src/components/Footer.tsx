export const Footer = () => {
  return (
    <footer className="px-4 md:px-8 pb-8 pt-16">
      <div className="max-w-6xl mx-auto glass brutal rounded-3xl p-8 text-center">
        <h3 className="font-display font-bold text-4xl md:text-6xl mb-4">
          ready to <span className="bg-primary text-primary-foreground border-2 border-foreground brutal px-2 inline-block -rotate-2">vibe?</span>
        </h3>
        <button className="brutal-hover bg-foreground text-background border-2 border-foreground rounded-2xl px-8 py-4 font-display font-bold text-lg mb-8">
          Download the app
        </button>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 font-display font-semibold text-sm border-t-2 border-foreground pt-6">
          <a href="#" className="hover:underline">Privacy</a>
          <a href="#" className="hover:underline">Terms</a>
          <a href="#" className="hover:underline">Community guidelines</a>
          <a href="#" className="hover:underline">Safety</a>
          <a href="#" className="hover:underline">Contact</a>
        </div>
        <p className="font-body text-xs text-muted-foreground mt-4">© 2026 VIBEZ. Made with chaos & love.</p>
      </div>
    </footer>
  );
};
