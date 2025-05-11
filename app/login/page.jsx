// app/login/page.jsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FaGoogle, FaGithub } from "react-icons/fa";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import loginImage from "@/public/assets/loginimg.png";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "", rememberMe: false });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Save token & optional user info
      localStorage.setItem("token", data.token);
      // redirect to dashboard or home
      router.push("/welcome");
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <Navbar />

      <main className="flex-grow flex items-center justify-center px-4 py-10">
        <div className="flex flex-col md:flex-row bg-gray-800 rounded-xl shadow-lg overflow-hidden w-full max-w-5xl">
          {/* Illustration */}
          <div className="hidden md:block md:w-1/2">
            <Image src={loginImage} alt="Login Illustration" className="w-full h-full object-cover" />
          </div>

          {/* Form */}
          <div className="w-full md:w-1/2 p-8">
            <h2 className="text-3xl font-bold mb-2 text-center">Login</h2>
            <p className="text-center text-gray-400 mb-6">Glad you’re back!</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none"
                />
              </div>

              {/* Remember me */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="rememberMe"
                  id="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 accent-purple-500"
                />
                <label htmlFor="rememberMe" className="text-sm text-gray-300">Remember me</label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 transition-colors px-4 py-2 rounded-full text-white font-semibold"
              >
                {isLoading ? "Logging in..." : "Login"}
              </button>

              {/* Links */}
              <div className="text-right text-sm mt-2">
                <Link href="/forgot-password" className="text-purple-400 hover:underline">Forgot password?</Link>
              </div>

              {/* Social */}
              <div className="flex flex-col space-y-3 mt-6">
                <button type="button" className="flex items-center justify-center gap-2 bg-white text-black px-4 py-2 rounded shadow">
                  <FaGoogle /> Login with Google
                </button>
                <button type="button" className="flex items-center justify-center gap-2 bg-black text-white px-4 py-2 rounded shadow">
                  <FaGithub /> Login with GitHub
                </button>
              </div>

              {/* Signup link */}
              <p className="text-center text-sm text-gray-400 mt-6">
                Don’t have an account?{" "}
                <Link href="/signup" className="text-purple-400 hover:underline">Signup</Link>
              </p>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
