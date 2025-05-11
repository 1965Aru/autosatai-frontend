// app/services/page.jsx
"use client";

import React from "react";
import Navbar from "../../components/Navbar";  // Navbar import
import Image from "next/image";

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Render Navbar */}
      <Navbar />  {/* Make sure this line is included to render the Navbar */}

      <div className="pt-20 pb-20">
        {/* Title Section */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-4">
            <span className="text-purple-500">Explore Our</span>{" "}
            <span className="text-pink-500">Data-Driven Services</span>
          </h1>
          <p className="text-lg max-w-3xl mx-auto px-4">
            AutoSatAI delivers AI-powered geospatial insights through satellite data analysis and visualization
          </p>
        </div>

        {/* Services Cards */}
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16">
                <Image
                  src="/assets/Dataexplorationimg.png"
                  alt="Data Exploration"
                  width={100}
                  height={100}
                />
              </div>
            </div>
            <h3 className="text-gray-800 text-xl font-semibold mb-4">Data Exploration</h3>
            <p className="text-gray-600">
              Unlock patterns and insights from geospatial data with custom AI analysis.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16">
                <Image
                  src="/assets/Datavisualizationimg.png"
                  alt="Data Visualization"
                  width={100}
                  height={100}
                />
              </div>
            </div>
            <h3 className="text-gray-800 text-xl font-semibold mb-4">Data Visualization</h3>
            <p className="text-gray-600">
              Visualize geospatial data with clarity and precision through interactive dashboards and maps.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16">
                <Image
                  src="/assets/Reportgenerationimg.png"
                  alt="Report Generation"
                  width={100}
                  height={100}
                />
              </div>
            </div>
            <h3 className="text-gray-800 text-xl font-semibold mb-4">Report Generation</h3>
            <p className="text-gray-600">
              Generate detailed, data-driven report templates complete with analysis and comprehensive documentation.
            </p>
          </div>
        </div>

        {/* Explore More Button */}
        <div className="text-center mt-12">
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full">
            Explore More...
          </button>
        </div>

        {/* Description */}
        <div className="mt-10 text-center">
          <p className="text-gray-400 max-w-4xl mx-auto px-4 italic text-sm">
            Our AI-driven geospatial analysis system helps organizations unlock deep insights from satellite data. Whether you need data
            exploration, visualization, or detailed reports, AutoSat AI empowers decision-making with cutting-edge technology.
          </p>
        </div>
      </div>
    </div>
  );
}
