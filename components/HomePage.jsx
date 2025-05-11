"use client";

import React from "react";
import { useRouter } from "next/navigation";

const HomePage = () => {
  const router = useRouter();

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background Video */}
      <video
        src="/assets/background.mp4"
        autoPlay
        loop
        muted
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      {/* Hero Card with light black overlay (no blur) */}
      <div className="absolute inset-0 flex items-center justify-center z-10 px-4">
        <div
          className="
            bg-black/40
            p-10
            max-w-2xl
            w-full
            text-center
            space-y-6
            rounded-2xl
          "
        >
          <h1 className="text-2xl md:text-4xl font-bold text-white">
            "Transforming Satellite Data into Actionable Intelligence."
          </h1>
          <p className="text-base md:text-lg text-white">
            Bringing your vision to life with AI-powered satellite intelligence
          </p>
          <button
            onClick={() => router.push("/login")}
            className="
              inline-block
              bg-gradient-to-r from-purple-500 to-pink-500
              text-white
              px-8 py-3
              rounded-full
              shadow-lg
              hover:scale-105
              transition-transform duration-300
            "
          >
            Let's get started!
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
