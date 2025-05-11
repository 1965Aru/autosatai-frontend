"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Navbar from "/components/Navbar";

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navbar */}
      <Navbar />

      {/* Content Container */}
      <div className="pt-20 pb-20">
        {/* Title Section */}
        <div className="text-center mb-10">
          <motion.h1
            className="text-4xl font-bold mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-purple-500">Our Mission:</span>{" "}
            <span className="text-pink-500">Transforming Data into Impact</span>
          </motion.h1>
          <p className="text-lg max-w-3xl mx-auto px-4 text-gray-300">
            Empowering industries with actionable satellite intelligence through cutting-edge AI solutions.
          </p>
        </div>

        {/* Image + Content Section */}
        <motion.div
          className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center gap-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          {/* Image */}
          <div className="w-full md:w-1/2">
            <div className="rounded-2xl overflow-hidden shadow-xl">
              <Image
                src="/assets/Aboutusimg.png"
                alt="About AutoSat AI"
                width={800}
                height={600}
                className="w-full h-auto object-cover rounded-2xl"
              />
            </div>
          </div>

          {/* Mission Text */}
          <div className="w-full md:w-1/2 space-y-5 text-gray-300 text-lg leading-relaxed">
            <p>
              At <span className="text-pink-400 font-semibold">AutoSat AI</span>, we unlock the power of satellite data by converting raw imagery into structured datasets, interactive visualizations, and insightful reports.
            </p>
            <p>
              From tracking environmental changes and agricultural trends to disaster response — we deliver precision intelligence to researchers, industries, and governments.
            </p>
            <p className="text-pink-400 font-medium">
              Satellite insights. Actionable results.
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.footer
          className="text-center text-sm text-gray-500 mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          © 2025 <span className="text-white font-medium">AutoSat AI</span>. All Rights Reserved.
        </motion.footer>
      </div>
    </div>
  );
}
