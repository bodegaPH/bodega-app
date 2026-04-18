"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

interface AccountSettingsFormProps {
  user: {
    name: string;
    email: string;
  };
}

export default function AccountSettingsForm({ user }: AccountSettingsFormProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  const isEmailChanged = email !== user.email;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    // Require password if email is being changed
    if (isEmailChanged && !currentPassword) {
      setMessage({ type: "error", text: "Current password is required to change email" });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          email,
          ...(isEmailChanged && { currentPassword })
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to update profile" });
        setIsLoading(false);
        return;
      }

      setMessage({ type: "success", text: "Profile updated successfully" });
      setCurrentPassword(""); // Clear password field
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "An error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Global message banner at top */}
      {message && (
        <div
          className={`px-4 py-3 text-[10px] font-mono uppercase tracking-widest border ${
            message.type === "success"
              ? "bg-emerald-950/30 text-emerald-400 border-emerald-500/30"
              : "bg-rose-950/30 text-rose-400 border-rose-500/30"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name Field */}
      <div>
        <label htmlFor="name" className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
          Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-4 py-3 bg-zinc-950 border border-white/10 rounded-none text-[12px] font-mono text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-none"
        />
      </div>

      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
          Email
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 bg-zinc-950 border border-white/10 rounded-none text-[12px] font-mono text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-none"
        />
        {isEmailChanged && (
          <div className="mt-3 bg-amber-500/5 border border-amber-500/20 p-3 rounded-none">
            <p className="text-[9px] font-mono uppercase tracking-widest text-amber-500">
              Changing your email requires verifying your current password below.
            </p>
          </div>
        )}
      </div>

      {/* Current Password Field (shown when email is changed) */}
      {isEmailChanged && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <label htmlFor="currentPassword" className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
            Current Password <span className="text-rose-500">*</span>
          </label>
          <input
            type="password"
            id="currentPassword"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required={isEmailChanged}
            placeholder="ENTER CURRENT PASSWORD"
            className="w-full px-4 py-3 bg-zinc-950 border border-white/10 rounded-none text-[12px] font-mono text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-none"
          />
        </div>
      )}



      {/* Submit Button */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          loading={isLoading}
        >
          Save Changes
        </Button>
      </div>
      </form>
    </div>
  );
}
