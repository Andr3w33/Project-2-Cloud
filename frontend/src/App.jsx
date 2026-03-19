import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter
} from 'recharts';

function App() {
  // Existing filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [dietFilter, setDietFilter] = useState('all');

  // New states for API data
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data from Azure Function on load
  useEffect(() => {
    const fetchNutritionalData = async () => {
      try {
        // This pulls the URL from your .env file
        const apiUrl = import.meta.env.VITE_API_URL;

        if (!apiUrl) {
          throw new Error("API URL is missing. Check your .env file!");
        }

        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNutritionalData();
  }, []);

  return (
    <div className="bg-gray-100 min-h-screen font-sans text-gray-900">

      {/* HEADER */}
      <header className="bg-blue-600 p-4 text-white shadow-md">
        <h1 className="text-3xl font-semibold">Nutritional Insights</h1>
      </header>

      <main className="container mx-auto p-6">

        {/* CHARTS SECTION */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Explore Nutritional Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Bar Chart Container */}
            <div className="bg-white p-4 shadow-lg rounded-lg">
              <h3 className="font-semibold text-lg">Bar Chart</h3>
              <p className="text-sm text-gray-600 mb-2">Average macronutrient content by diet type.</p>
              <div className="w-full h-48 bg-gray-50 flex items-center justify-center border border-dashed border-gray-300 rounded">
                <span className="text-gray-400">Chart rendering here...</span>
              </div>
            </div>

            {/* Scatter Plot Container */}
            <div className="bg-white p-4 shadow-lg rounded-lg">
              <h3 className="font-semibold text-lg">Scatter Plot</h3>
              <p className="text-sm text-gray-600 mb-2">Nutrient relationships (e.g., protein vs carbs).</p>
              <div className="w-full h-48 bg-gray-50 flex items-center justify-center border border-dashed border-gray-300 rounded">
                <span className="text-gray-400">Chart rendering here...</span>
              </div>
            </div>

            {/* Heatmap Container */}
            <div className="bg-white p-4 shadow-lg rounded-lg">
              <h3 className="font-semibold text-lg">Heatmap</h3>
              <p className="text-sm text-gray-600 mb-2">Nutrient correlations.</p>
              <div className="w-full h-48 bg-gray-50 flex items-center justify-center border border-dashed border-gray-300 rounded">
                <span className="text-gray-400">Chart rendering here...</span>
              </div>
            </div>

            {/* Pie Chart Container */}
            <div className="bg-white p-4 shadow-lg rounded-lg">
              <h3 className="font-semibold text-lg">Pie Chart</h3>
              <p className="text-sm text-gray-600 mb-2">Recipe distribution by diet type.</p>
              <div className="w-full h-48 bg-gray-50 flex items-center justify-center border border-dashed border-gray-300 rounded">
                <span className="text-gray-400">Chart rendering here...</span>
              </div>
            </div>

          </div>
        </section>

        {/* FILTERS SECTION */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Filters and Data Interaction</h2>
          <div className="flex flex-wrap gap-4">
            <input
              type="text"
              placeholder="Search by Diet Type"
              className="p-2 border border-gray-300 rounded w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="p-2 border border-gray-300 rounded w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={dietFilter}
              onChange={(e) => setDietFilter(e.target.value)}
            >
              <option value="all">All Diet Types</option>
              <option value="vegan">Vegan</option>
              <option value="keto">Keto</option>
              <option value="mediterranean">Mediterranean</option>
            </select>
          </div>
        </section>

        {/* API BUTTONS SECTION */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Interaction</h2>
          <div className="flex flex-wrap gap-4">
            <button className="bg-blue-600 hover:bg-blue-700 transition text-white py-2 px-4 rounded shadow">
              Get Nutritional Insights
            </button>
            <button className="bg-green-600 hover:bg-green-700 transition text-white py-2 px-4 rounded shadow">
              Get Recipes
            </button>
            <button className="bg-purple-600 hover:bg-purple-700 transition text-white py-2 px-4 rounded shadow">
              Get Clusters
            </button>
          </div>
        </section>

        {/* PAGINATION SECTION */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Pagination</h2>
          <div className="flex justify-start gap-2 mt-4">
            <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition">Previous</button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded shadow">1</button>
            <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition">2</button>
            <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition">Next</button>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-blue-600 p-4 text-white text-center mt-10">
        <p>&copy; 2026 Nutritional Insights. All Rights Reserved.</p>

        {/* Dynamic Metadata Display */}
        <p className="text-sm mt-2 opacity-80">
          {loading ? "Fetching data from Azure..." :
            error ? `Error: ${error}` :
              dashboardData ? `Backend Execution Time: ${dashboardData.metadata.executionTimeMs}` :
                "No data available"}
        </p>
      </footer>

    </div>
  );
}

export default App;