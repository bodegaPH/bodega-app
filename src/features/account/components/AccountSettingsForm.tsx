"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/src/components/ui/Button";

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
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name Field */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-2">
          Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
        />
      </div>

      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
          Email
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white font-mono text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
        />
        {isEmailChanged && (
          <div className="mt-3 flex items-start gap-2 text-yellow-500/90 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm">
              Changing your email requires verifying your current password below.
            </p>
          </div>
        )}
      </div>

      {/* Current Password Field (shown when email is changed) */}
      {isEmailChanged && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <label htmlFor="currentPassword" className="block text-sm font-medium text-zinc-300 mb-2">
            Current Password <span className="text-rose-400">*</span>
          </label>
          <input
            type="password"
            id="currentPassword"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required={isEmailChanged}
            placeholder="Enter your current password"
            className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
          />
        </div>
      )}

      {/* Message */}
      {message && (
        <div
          className={`px-4 py-3 rounded-xl text-sm ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-200 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-200 border border-rose-500/20"
          }`}
        >
          {message.text}
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
  );
}
