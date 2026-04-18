"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

export default function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    // Client-side validation
    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to change password" });
        setIsLoading(false);
        return;
      }

      setMessage({ type: "success", text: "Password changed successfully" });
      // Reset form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
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
      {/* Current Password */}
      <div>
        <label htmlFor="currentPassword" className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
          Current Password
        </label>
        <input
          type="password"
          id="currentPassword"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className="w-full px-4 py-3 bg-zinc-950 border border-white/10 rounded-none text-[12px] font-mono text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-none"
        />
      </div>

      <div className="border-t border-white/5 pt-5 mt-5">
        {/* New Password */}
        <div className="mb-5">
          <label htmlFor="newPassword" className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
            New Password
          </label>
          <input
            type="password"
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-4 py-3 bg-zinc-950 border border-white/10 rounded-none text-[12px] font-mono text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-none"
          />
          <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 mt-2">Must be at least 8 characters long</p>
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
            Confirm New Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-4 py-3 bg-zinc-950 border border-white/10 rounded-none text-[12px] font-mono text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-none"
          />
        </div>
      </div>



      {/* Submit Button */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          loading={isLoading}
        >
          Change Password
        </Button>
      </div>
      </form>
    </div>
  );
}
