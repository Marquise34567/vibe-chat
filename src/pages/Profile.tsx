import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Check, Loader2, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { COUNTRIES } from "@/lib/countries";
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

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [tier, setTier] = useState<"free" | "plus" | "vip">("free");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("id, display_name, gender, country, interests, avatar_url, subscription_tier")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          toast.error("Could not load profile");
          setLoading(false);
          return;
        }
        const p = data as ProfileRow | null;
        setDisplayName(p?.display_name ?? "");
        setGender(p?.gender ?? null);
        setCountry(p?.country ?? null);
        setInterests(p?.interests ?? []);
        setAvatarUrl(p?.avatar_url ?? null);
        setTier(p?.subscription_tier ?? "free");
        setLoading(false);
      });
  }, [user]);

  const toggleInterest = (i: string) =>
    setInterests((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadErr) {
      setUploading(false);
      toast.error(uploadErr.message);
      return;
    }

    // Cache-bust so the new image shows immediately
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${pub.publicUrl}?v=${Date.now()}`;

    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", user.id);

    setUploading(false);
    if (dbErr) {
      toast.error(dbErr.message);
      return;
    }
    setAvatarUrl(url);
    toast.success("New look 🔥");
  };

  const removeAvatar = async () => {
    if (!user || !avatarUrl) return;
    setUploading(true);
    // Try to remove any avatar files for this user
    await supabase.storage
      .from("avatars")
      .list(user.id)
      .then(({ data }) =>
        data?.length
          ? supabase.storage.from("avatars").remove(data.map((f) => `${user.id}/${f.name}`))
          : null
      );

    await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
    setAvatarUrl(null);
    setUploading(false);
    toast.success("Avatar removed");
  };

  const save = async () => {
    if (!user) return;
    if (!displayName.trim()) {
      toast.error("Display name can't be empty");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        gender,
        country,
        interests,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile saved ✨");
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="text-center py-32 font-display font-bold text-2xl animate-pulse">
          loading your vibe...
        </div>
      </div>
    );
  }

  const initial = (displayName || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-10">
        <button
          onClick={() => navigate(-1)}
          className="font-display font-bold text-sm flex items-center gap-1 mb-4 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={3} /> back
        </button>

        <div className="mb-8">
          <div className="sticker bg-highlight mb-3 inline-flex">your vibe ✨</div>
          <h1 className="font-display font-bold text-5xl md:text-6xl leading-none">
            edit <span className="bg-primary text-primary-foreground border-2 border-foreground brutal px-3 inline-block -rotate-2">profile.</span>
          </h1>
        </div>

        {/* Avatar card */}
        <div className="glass brutal-lg rounded-3xl p-6 md:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-2xl border-2 border-foreground brutal bg-primary overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Your avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display font-bold text-6xl text-primary-foreground">{initial}</span>
                )}
              </div>
              {tier === "vip" && (
                <div className="absolute -top-2 -right-2 sticker bg-foreground text-background text-xs animate-wiggle">
                  👑 VIP
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="font-display font-bold text-2xl">{displayName || "Anonymous"}</div>
              <div className="text-sm text-muted-foreground font-medium mb-3">{user?.email}</div>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatar}
                />
                <button
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                  className="brutal-hover bg-foreground text-background border-2 border-foreground rounded-xl px-3 py-2 font-display font-bold text-sm flex items-center gap-1 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" strokeWidth={3} />}
                  {avatarUrl ? "Change" : "Upload avatar"}
                </button>
                {avatarUrl && (
                  <button
                    onClick={removeAvatar}
                    disabled={uploading}
                    className="brutal-hover bg-card border-2 border-foreground rounded-xl px-3 py-2 font-display font-bold text-sm flex items-center gap-1 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" strokeWidth={3} /> Remove
                  </button>
                )}
              </div>
              <div className="text-xs text-muted-foreground font-medium mt-2">JPG/PNG, max 5MB</div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="glass brutal-lg rounded-3xl p-6 md:p-8 space-y-6">
          <div>
            <label className="font-display font-bold text-sm mb-2 block">Display name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={32}
              className="brutal-input"
              placeholder="cooluser123"
            />
          </div>

          <div>
            <h3 className="font-display font-bold text-xl mb-3">i identify as...</h3>
            <div className="flex flex-wrap gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`brutal-sm border-2 border-foreground rounded-full px-3 py-2 font-display font-bold text-sm transition-colors ${
                    gender === g ? "bg-primary text-primary-foreground" : "bg-card hover:bg-highlight"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-display font-bold text-xl mb-3">📍 Country</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setCountry(c.code)}
                  className={`brutal-sm border-2 border-foreground rounded-2xl p-3 text-center transition-colors ${
                    country === c.code ? "bg-accent text-accent-foreground" : "bg-card hover:bg-highlight"
                  }`}
                >
                  <div className="text-3xl mb-1">{c.flag}</div>
                  <div className="font-display font-bold text-xs">{c.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-display font-bold text-xl mb-3">⚡ Interests</h3>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <button
                  key={i}
                  onClick={() => toggleInterest(i)}
                  className={`brutal-sm border-2 border-foreground rounded-xl px-3 py-2 font-display font-bold text-sm transition-colors ${
                    interests.includes(i) ? "bg-secondary text-secondary-foreground" : "bg-card hover:bg-highlight"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t-2 border-foreground flex flex-col sm:flex-row gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="brutal-hover flex-1 bg-foreground text-background border-2 border-foreground rounded-2xl py-4 font-display font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" strokeWidth={3} />}
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button
              onClick={() => navigate("/lobby")}
              className="brutal-hover bg-primary text-primary-foreground border-2 border-foreground rounded-2xl px-6 py-4 font-display font-bold text-lg flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" strokeWidth={3} /> Go to lobby
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
