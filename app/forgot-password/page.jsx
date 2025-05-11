"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
// import { authService } from "@/lib/api"; // Uncomment and update with your actual path

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      await authService.forgotPassword(email); // API call
      setMessage("If your email is registered, you'll receive a reset link shortly.");
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("There was an error processing your request. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-4 py-16">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold mb-2 text-center">Forgot Password</h2>
        <p className="text-center text-gray-400 mb-6">Enter your email to reset your password</p>

        {message && <div className="bg-green-600 text-white p-3 mb-4 rounded">{message}</div>}
        {error && <div className="bg-red-600 text-white p-3 mb-4 rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block mb-1">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-full text-white font-semibold transition-colors"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Reset Password"}
          </button>

          <div className="text-center mt-4">
            <Link href="/login" className="text-purple-400 hover:underline">Back to Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
