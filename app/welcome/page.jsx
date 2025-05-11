"use client";

import React from "react";
import { useRouter } from "next/navigation";

const WelcomePage = () => {
  const router = useRouter();

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 🔄 Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/assets/Welcomevideo.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* ✨ Foreground Content */}
      <div className="relative z-20 flex flex-col items-center justify-center h-full text-center text-white px-4">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-2xl">
          Welcome to <span className="text-purple-400">AutoSat AI</span>!
        </h1>
        <button
          onClick={() => router.push("/dataexploration")}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-3 text-lg font-semibold rounded-full shadow-2xl transition-all hover:scale-105"
        >
          GET STARTED..
        </button>
      </div>
    </div>
  );
};

export default WelcomePage;
