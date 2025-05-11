"use client";

import React from "react";
import { useRouter } from "next/navigation";

const Navbar = () => {
  const router = useRouter();

  return (
    <div className="absolute top-0 left-0 w-full z-20">
      <div className="flex items-center justify-between px-8 py-6">
        <div
          className="flex items-center cursor-pointer"
          onClick={() => router.push("/")}
        >
          <img
            src="/assets/logo.png"
            alt="AutoSat AI Logo"
            className="w-8 h-8"
          />
          <span className="ml-2 text-white font-bold text-2xl">AutoSat AI</span>
        </div>

        <div className="hidden md:flex items-center space-x-8 text-white text-base">
          {["Home", "Services", "About us", "Contact"].map((lbl) => (
            <button
              key={lbl}
              onClick={() =>
                router.push(
                  lbl === "Home"
                    ? "/"
                    : `/${lbl.toLowerCase().replace(/\s/g, "")}`
                )
              }
              className="hover:text-pink-400 transition-colors"
            >
              {lbl}
            </button>
          ))}

          <button
            onClick={() => router.push("/login")}
            className="hover:text-pink-400 transition-colors"
          >
            Log In
          </button>

          <button
            onClick={() => router.push("/signup")}
            className="px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:opacity-90 transition-opacity text-sm font-semibold"
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
