"use client";

import React from "react";
import { FaSearch } from "react-icons/fa";

const SearchBar = ({ onSearch }) => {
  return (
    <div className="search-container">
      <div className="search-bar flex items-center border border-gray-300 rounded-full px-4 py-2 shadow-md bg-white">
        <input
          type="text"
          placeholder="Search..."
          onChange={onSearch}
          className="search-input flex-grow px-3 py-1 text-gray-700 focus:outline-none rounded-l-full"
        />
        <button className="search-button text-gray-600 hover:text-gray-800 focus:outline-none">
          <FaSearch />
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
