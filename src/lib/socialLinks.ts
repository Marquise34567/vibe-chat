/**
 * Social links / streamer handles for profiles.
 */

export type SocialPlatform = {
  id: string;
  name: string;
  icon: string; // emoji or we'll use lucide
  color: string;
  placeholder: string;
  urlPrefix: string;
};

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { id: "instagram", name: "Instagram", icon: "📷", color: "from-pink-500 to-violet-500", placeholder: "@username", urlPrefix: "https://instagram.com/" },
  { id: "tiktok", name: "TikTok", icon: "🎵", color: "from-rose-500 to-cyan-500", placeholder: "@username", urlPrefix: "https://tiktok.com/@" },
  { id: "twitch", name: "Twitch", icon: "🎮", color: "from-violet-600 to-fuchsia-500", placeholder: "channel", urlPrefix: "https://twitch.tv/" },
  { id: "youtube", name: "YouTube", icon: "▶️", color: "from-red-500 to-red-600", placeholder: "@handle", urlPrefix: "https://youtube.com/@" },
  { id: "twitter", name: "X / Twitter", icon: "𝕏", color: "from-gray-700 to-black", placeholder: "@handle", urlPrefix: "https://x.com/" },
  { id: "snapchat", name: "Snapchat", icon: "👻", color: "from-yellow-400 to-yellow-500", placeholder: "username", urlPrefix: "https://snapchat.com/add/" },
  { id: "discord", name: "Discord", icon: "💬", color: "from-indigo-500 to-violet-600", placeholder: "username", urlPrefix: "" },
  { id: "spotify", name: "Spotify", icon: "🎧", color: "from-green-500 to-emerald-600", placeholder: "username", urlPrefix: "https://open.spotify.com/user/" },
];

export type SocialLinks = Record<string, string>; // platformId -> handle

export const formatSocialUrl = (platform: SocialPlatform, handle: string): string => {
  if (!handle) return "";
  if (handle.startsWith("http")) return handle;
  return platform.urlPrefix + handle.replace(/^@/, "");
};

export const platformById = (id: string) => SOCIAL_PLATFORMS.find((p) => p.id === id);
