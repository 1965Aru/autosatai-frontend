// app/signup/page.jsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaGoogle, FaGithub } from "react-icons/fa";
import Link from "next/link";
import Image from "next/image";
import signupImage from "@/public/assets/loginimg.png";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setErrors({});
    setSubmitError("");
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSubmitError("");
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    if (!formData.agreeToTerms) newErrors.agreeToTerms = "You must agree to the terms";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { fullName, email, password } = formData;
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Signup failed");
      }

      alert("Signup successful! Please log in.");
      router.push("/login");
    } catch (err) {
      console.error("Signup error:", err);
      setSubmitError(err.message);
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
            <Image
              src={signupImage}
              alt="Signup Illustration"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Form */}
          <div className="w-full md:w-1/2 p-8">
            <h2 className="text-3xl font-bold mb-2 text-center">Create Account</h2>
            <p className="text-center text-gray-400 mb-6">
              Join us to get started with AutoSat AI
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {submitError && (
                <p className="text-red-500 text-sm text-center">{submitError}</p>
              )}

              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  id="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded bg-gray-700 text-white border ${
                    errors.fullName ? "border-red-500" : "border-gray-600"
                  } focus:outline-none`}
                />
                {errors.fullName && (
                  <span className="text-red-500 text-sm">{errors.fullName}</span>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded bg-gray-700 text-white border ${
                    errors.email ? "border-red-500" : "border-gray-600"
                  } focus:outline-none`}
                />
                {errors.email && (
                  <span className="text-red-500 text-sm">{errors.email}</span>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded bg-gray-700 text-white border ${
                    errors.password ? "border-red-500" : "border-gray-600"
                  } focus:outline-none`}
                />
                {errors.password && (
                  <span className="text-red-500 text-sm">{errors.password}</span>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded bg-gray-700 text-white border ${
                    errors.confirmPassword ? "border-red-500" : "border-gray-600"
                  } focus:outline-none`}
                />
                {errors.confirmPassword && (
                  <span className="text-red-500 text-sm">
                    {errors.confirmPassword}
                  </span>
                )}
              </div>

              {/* Agree to Terms */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  id="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  className="h-4 w-4 accent-purple-500"
                />
                <label htmlFor="agreeToTerms" className="text-sm text-gray-300">
                  I agree to the{" "}
                  <Link href="/terms" className="text-purple-400 hover:underline">
                    Terms and Conditions
                  </Link>
                </label>
              </div>
              {errors.agreeToTerms && (
                <span className="text-red-500 text-sm">
                  {errors.agreeToTerms}
                </span>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 transition-colors px-4 py-2 rounded-full text-white font-semibold"
              >
                {isLoading ? "Creating Account..." : "Sign Up"}
              </button>

              {/* Social Buttons */}
              <div className="flex flex-col space-y-3 mt-6">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 bg-white text-black px-4 py-2 rounded shadow"
                >
                  <FaGoogle /> Signup with Google
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 bg-black text-white px-4 py-2 rounded shadow"
                >
                  <FaGithub /> Signup with GitHub
                </button>
              </div>

              {/* Already have account */}
              <p className="text-center text-sm text-gray-400 mt-6">
                Already have an account?{" "}
                <Link href="/login" className="text-purple-400 hover:underline">
                  Login
                </Link>
              </p>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
