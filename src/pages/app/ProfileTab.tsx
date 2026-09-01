import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera, Check, Loader2, Crown, Coins, Sparkles, LogOut, ChevronRight, Gift,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { GlassCard } from "@/components/glass";
import { GlassSheet } from "@/components/glass";
import { COUNTRIES } from "@/lib/countries";
import { TIER_FEATURES, TIER_LABEL, Tier } from "@/lib/tiers";
import { useCoins } from "@/hooks/useCoins";
import { useTier } from "@/hooks/useTier";
import { GIFTS, COIN_PACKAGES } from "@/lib/config";
import { SOCIAL_PLATFORMS, formatSocialUrl } from "@/lib/socialLinks";
import { getScholarVerified, getScholarEmail, setScholarVerified, isScholarEmail, clearScholarVerified } from "@/lib/verification";
import {
  getLocalProfile, saveLocalProfile, updateLocalUserMeta, type LocalProfile,
} from "@/lib/localUser";
import { toast } from "sonner";

const GENDERS = ["Woman", "Man", "Non-binary", "Trans", "Genderfluid", "Prefer not to say"];
const INTERESTS = ["Music 🎵", "Gaming 🎮", "Art 🎨", "Sports ⚽", "Anime ✨", "Travel ✈️", "Foodie 🍜", "Memes 💀"];

type ProfileRow = {
  id: string;
  display_name: string | null;
  gender: string | null;
  country: string | null;
  interests: string[] | null;
  avatar_url: string | null;
  subscription_tier: "free" | "plus" | "vip";
};

const ProfileTab = () => {
  const navigate = useNavigate();
  const { user, isLocal, signOut } = useAuth();
  const { tier, setTier: setTierHook } = useTier();
  const { coins, spend, buy } = useCoins();
  const fileInput = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCoins, setShowCoins] = useState(false);
  const [showGifts, setShowGifts] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [socials, setSocials] = useState<Record<string, string>>({});
  const [scholarVerified, setScholarVerifiedState] = useState(false);
  const [scholarEmail, setScholarEmailState] = useState<string | null>(null);
  const [showScholar, setShowScholar] = useState(false);
  const [scholarInput, setScholarInput] = useState("");

  // Load profile (local or Supabase)
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    // Scholar status from localStorage (applies to both local + Supabase users)
    setScholarVerifiedState(getScholarVerified());
    setScholarEmailState(getScholarEmail());
    if (isLocal) {
      const p = getLocalProfile();
      setDisplayName(p.display_name);
      setGender(p.gender);
      setCountry(p.country);
      setInterests(p.interests);
      setAvatarUrl(p.avatar_url);
      setSocials((p as Record<string, unknown>).socials as Record<string, string> ?? {});
      setLoading(false);
      return;
    }
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) { toast.error("Could not load profile"); setLoading(false); return; }
        const p = data as ProfileRow | null;
        setDisplayName(p?.display_name ?? "");
        setGender(p?.gender ?? null);
        setCountry(p?.country ?? null);
        setInterests(p?.interests ?? []);
        setAvatarUrl(p?.avatar_url ?? null);
        setSocials((p?.socials as Record<string, string>) ?? {});
        setLoading(false);
      });
  }, [user, isLocal]);

  const toggleInterest = (i: string) =>
    setInterests((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  // Avatar upload — local uses data URL in localStorage; Supabase uses storage
  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploading(true);

    if (isLocal) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        saveLocalProfile({ avatar_url: dataUrl });
        setAvatarUrl(dataUrl);
        setUploading(false);
        toast.success("New look 🔥");
      };
      reader.readAsDataURL(file);
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadErr) { setUploading(false); toast.error(uploadErr.message); return; }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${pub.publicUrl}?v=${Date.now()}`;
    const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setUploading(false);
    if (dbErr) { toast.error(dbErr.message); return; }
    setAvatarUrl(url);
    toast.success("New look 🔥");
  };

  const removeAvatar = async () => {
    if (!user || !avatarUrl) return;
    setUploading(true);
    if (isLocal) {
      saveLocalProfile({ avatar_url: null });
      setAvatarUrl(null);
      setUploading(false);
      toast.success("Avatar removed");
      return;
    }
    await supabase.storage.from("avatars").list(user.id).then(({ data }) =>
      data?.length ? supabase.storage.from("avatars").remove(data.map((f) => `${user.id}/${f.name}`)) : null
    );
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
    setAvatarUrl(null);
    setUploading(false);
    toast.success("Avatar removed");
  };

  const save = async () => {
    if (!user) return;
    if (!displayName.trim()) { toast.error("Display name can't be empty"); return; }
    setSaving(true);
    if (isLocal) {
      saveLocalProfile({ display_name: displayName.trim(), gender, country, interests, socials } as Partial<LocalProfile> & { socials?: Record<string, string> });
      updateLocalUserMeta({ display_name: displayName.trim(), gender, country, interests });
      setSaving(false);
      toast.success("Profile saved ✨");
      return;
    }
    const { error } = await supabase.from("profiles").update({
      display_name: displayName.trim(), gender, country, interests, socials,
    }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved ✨");
  };

  const verifyScholar = () => {
    if (!scholarInput.trim()) { toast.error("Enter your student email"); return; }
    if (!isScholarEmail(scholarInput)) {
      toast.error("That doesn't look like a student email (.edu, .ac.uk, etc.)");
      return;
    }
    setScholarVerified(scholarInput.trim());
    setScholarVerifiedState(true);
    setScholarEmailState(scholarInput.trim());
    setShowScholar(false);
    toast.success("Scholar verified! 🎓");
  };

  const removeScholar = () => {
    clearScholarVerified();
    setScholarVerifiedState(false);
    setScholarEmailState(null);
    toast("Scholar verification removed");
  };

  const updateSocial = (platformId: string, value: string) => {
    setSocials((s) => {
      const next = { ...s };
      if (value.trim()) next[platformId] = value.trim();
      else delete next[platformId];
      return next;
    });
  };

  const switchTier = async (next: Tier) => {
    if (!user) return;
    if (isLocal) {
      setTierHook(next);
      toast.success(`Switched to ${TIER_LABEL[next]} ✨`);
      return;
    }
    const { error } = await supabase.from("profiles").update({ subscription_tier: next }).eq("id", user.id);
    if (error) { toast.error(error.message); return; }
    setTierHook(next);
    toast.success(`Switched to ${TIER_LABEL[next]} ✨`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass px-6 py-4"><div className="animate-pulse font-semibold text-muted-foreground">Loading…</div></div>
      </div>
    );
  }

  const initial = (displayName || user?.email || "?").charAt(0).toUpperCase();

  const sendGift = (g: typeof GIFTS[number]) => {
    if (spend(g.cost)) {
      toast.success(`Sent ${g.emoji} ${g.name}!`);
      setShowGifts(false);
    } else {
      toast.error("Not enough coins. Top up?");
      setShowGifts(false);
      setShowCoins(true);
    }
  };

  return (
    <div className="min-h-screen px-4 pt-6">
      <div className="max-w-md mx-auto space-y-5">
        <div className="pt-2">
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        </div>

        {/* Avatar + identity card */}
        <GlassCard strong className="p-6" interactive={false}>
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-3">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-primary flex items-center justify-center ring-4 ring-background shadow-lg">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-primary-foreground">{initial}</span>
                )}
              </div>
              {TIER_FEATURES[tier].badge && (
                <span className="absolute -bottom-1 -right-1 badge badge-gold">{TIER_FEATURES[tier].badge}</span>
              )}
              <button
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center shadow-md disabled:opacity-50"
                aria-label="Change avatar"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" strokeWidth={2.5} />}
              </button>
              <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
            </div>
            <div className="text-xl font-bold flex items-center gap-2">
              {displayName || "Anonymous"}
              {scholarVerified && <span className="badge badge-gold">🎓 Scholar</span>}
            </div>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
            {avatarUrl && (
              <button onClick={removeAvatar} disabled={uploading} className="text-xs text-muted-foreground hover:text-destructive mt-1.5">
                Remove avatar
              </button>
            )}
          </div>
        </GlassCard>

        {/* Scholar verification card */}
        <GlassCard className="p-4" interactive={false}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                <span className="text-xl">🎓</span>
              </span>
              <div>
                <div className="font-semibold text-sm">Scholar verification</div>
                <div className="text-xs text-muted-foreground">
                  {scholarVerified ? `Verified: ${scholarEmail}` : "Verify with your .edu email"}
                </div>
              </div>
            </div>
            {scholarVerified ? (
              <button onClick={removeScholar} className="text-xs text-muted-foreground hover:text-destructive">
                Remove
              </button>
            ) : (
              <button onClick={() => setShowScholar(true)} className="btn-glass text-sm py-2 px-4">
                Verify
              </button>
            )}
          </div>
        </GlassCard>

        {/* Coins + Plus quick row */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setShowCoins(true)} className="text-left">
            <GlassCard className="p-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-highlight/20 flex items-center justify-center">
                <Coins className="w-5 h-5 text-highlight" strokeWidth={2.5} />
              </span>
              <div>
                <div className="font-bold text-lg leading-none">{coins}</div>
                <div className="text-xs text-muted-foreground">Coins · tap to top up</div>
              </div>
            </GlassCard>
          </button>
          <button onClick={() => navigate("/plus")} className="text-left">
            <GlassCard className="p-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" strokeWidth={2.5} />
              </span>
              <div>
                <div className="font-bold text-sm leading-none">{TIER_LABEL[tier]}</div>
                <div className="text-xs text-muted-foreground">Manage plan</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" strokeWidth={2.5} />
            </GlassCard>
          </button>
        </div>

        {/* Gifts quick action */}
        <button onClick={() => setShowGifts(true)} className="w-full text-left">
          <GlassCard className="p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-secondary/20 flex items-center justify-center">
              <Gift className="w-5 h-5 text-secondary" strokeWidth={2.5} />
            </span>
            <div className="flex-1">
              <div className="font-semibold text-sm">Send a gift</div>
              <div className="text-xs text-muted-foreground">Show someone you vibe with them</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={2.5} />
          </GlassCard>
        </button>

        {/* Dev tier switcher */}
        <GlassCard className="p-4" interactive={false}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold text-sm flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-primary" strokeWidth={2.5} /> Subscription
                <span className="badge text-[10px]">DEV</span>
              </div>
              <div className="text-xs text-muted-foreground">Switch tiers to test features.</div>
            </div>
            <div className="flex gap-2">
              {(["free", "plus", "vip"] as Tier[]).map((t) => (
                <button
                  key={t}
                  onClick={() => switchTier(t)}
                  className={`chip ${tier === t ? "chip-selected" : ""}`}
                >
                  {TIER_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Edit fields */}
        <GlassCard className="p-5 space-y-5" interactive={false}>
          <div>
            <label className="text-sm font-semibold mb-2 block">Display name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={32} className="input-glass" placeholder="cooluser123" />
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">I identify as</h3>
            <div className="flex flex-wrap gap-2">
              {GENDERS.map((g) => (
                <button key={g} onClick={() => setGender(g)} className={`chip ${gender === g ? "chip-selected" : ""}`}>{g}</button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Country</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {COUNTRIES.map((c) => (
                <button key={c.code} onClick={() => setCountry(c.code)} className={`chip flex-col py-2.5 ${country === c.code ? "chip-selected" : ""}`}>
                  <span className="text-xl">{c.flag}</span><span className="text-[11px]">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <button key={i} onClick={() => toggleInterest(i)} className={`chip ${interests.includes(i) ? "chip-selected" : ""}`}>{i}</button>
              ))}
            </div>
          </div>
          {/* Social links / streamer handles */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Socials & streamer handles</h3>
            <div className="space-y-2">
              {SOCIAL_PLATFORMS.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-base shrink-0`}>
                    {p.icon}
                  </span>
                  <input
                    value={socials[p.id] ?? ""}
                    onChange={(e) => updateSocial(p.id, e.target.value)}
                    placeholder={`${p.name} · ${p.placeholder}`}
                    className="input-glass flex-1"
                  />
                </div>
              ))}
            </div>
          </div>
          <button onClick={save} disabled={saving} className="btn-primary w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={2.5} />}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </GlassCard>

        {!isLocal && (
          <button onClick={signOut} className="w-full">
            <GlassCard className="p-4 flex items-center justify-center gap-2 text-destructive">
              <LogOut className="w-4 h-4" strokeWidth={2.5} /> Sign out
            </GlassCard>
          </button>
        )}

        <div className="text-center text-xs text-muted-foreground pb-2">FaceFrenzy · built for real connection</div>
      </div>

      {/* Coins sheet */}
      <GlassSheet open={showCoins} onClose={() => setShowCoins(false)} title="Get coins">
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 text-highlight font-bold text-2xl">
            <Coins className="w-6 h-6" strokeWidth={2.5} /> {coins}
          </div>
          <div className="text-xs text-muted-foreground">Your balance</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {COIN_PACKAGES.map((p) => (
            <button
              key={p.id}
              onClick={() => { buy(p.coins); toast.success(`+${p.coins} coins!`); setShowCoins(false); }}
              className="text-left"
            >
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Coins className="w-5 h-5 text-highlight" strokeWidth={2.5} />
                  <span className="font-bold text-lg">{p.coins}</span>
                  {p.bonus > 0 && <span className="badge badge-gold text-[10px]">+{p.bonus}</span>}
                </div>
                <div className="text-sm font-semibold text-primary">{p.price}</div>
              </GlassCard>
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">Coins buy gifts to send during chats.</p>
      </GlassSheet>

      {/* Gifts sheet */}
      <GlassSheet open={showGifts} onClose={() => setShowGifts(false)} title="Send a gift">
        <div className="flex items-center justify-center gap-2 mb-4 text-highlight font-bold">
          <Coins className="w-5 h-5" strokeWidth={2.5} /> {coins} coins
        </div>
        <div className="grid grid-cols-3 gap-3">
          {GIFTS.map((g) => {
            const afford = coins >= g.cost;
            return (
              <button
                key={g.id}
                onClick={() => sendGift(g)}
                disabled={!afford}
                className="text-center disabled:opacity-40"
              >
                <GlassCard className="p-4 flex flex-col items-center gap-1">
                  <span className="text-4xl">{g.emoji}</span>
                  <span className="text-xs font-semibold">{g.name}</span>
                  <span className="text-xs text-highlight font-bold flex items-center gap-0.5">
                    <Coins className="w-3 h-3" strokeWidth={2.5} /> {g.cost}
                  </span>
                </GlassCard>
              </button>
            );
          })}
        </div>
      </GlassSheet>

      {/* Scholar verification sheet */}
      <GlassSheet open={showScholar} onClose={() => setShowScholar(false)} title="Verify scholar status">
        <p className="text-sm text-muted-foreground text-center mb-4">
          Enter your university email to get the 🎓 Scholar badge and match with other verified students.
        </p>
        <div className="space-y-3">
          <input
            type="email"
            value={scholarInput}
            onChange={(e) => setScholarInput(e.target.value)}
            placeholder="yourname@university.edu"
            className="input-glass"
            onKeyDown={(e) => e.key === "Enter" && verifyScholar()}
          />
          <button onClick={verifyScholar} className="btn-primary w-full">
            <span className="mr-1">🎓</span> Verify student email
          </button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          We accept .edu, .ac.uk, .ac.jp, and other university domains.
        </p>
      </GlassSheet>
    </div>
  );
};

export default ProfileTab;
