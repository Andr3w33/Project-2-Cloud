import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter
} from 'recharts';

const COLORS = ['#2563eb', '#16a34a', '#7c3aed', '#db2777'];

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

  // --- Data Transformations ---
  // Pie Chart: convert { "vegan": 50, "keto": 30 } object into [{ name, value }] array
  const pieData = (dashboardData && dashboardData.dietDistribution) ? Object.keys(dashboardData.dietDistribution).map(key => ({
    name: key,
    value: dashboardData.dietDistribution[key]
  })) : [];

  // Bar Chart: .toFixed() returns strings, Recharts needs numbers
  const barData = (dashboardData && dashboardData.dietAverages) ? dashboardData.dietAverages.map(d => ({
    ...d,
    protein: parseFloat(d.protein),
    carbs: parseFloat(d.carbs),
    fat: parseFloat(d.fat)
  })) : [];

  // Heatmap renderer using the correlation matrix from the backend
  const renderHeatmap = () => {
    if (!dashboardData || !dashboardData.correlations) return <span className="text-gray-400">Loading...</span>;
    return (
      <div className="grid grid-cols-4 gap-1 text-xs text-center h-full">
        <div className="font-bold p-1"></div>
        <div className="font-bold p-1 border-b flex items-center justify-center">Protein</div>
        <div className="font-bold p-1 border-b flex items-center justify-center">Carbs</div>
        <div className="font-bold p-1 border-b flex items-center justify-center">Fat</div>
        {['Protein', 'Carbs', 'Fat'].map(yLabel => (
          <React.Fragment key={yLabel}>
            <div className="font-bold p-1 border-r flex items-center justify-center">{yLabel}</div>
            {['Protein', 'Carbs', 'Fat'].map(xLabel => {
              const cell = dashboardData.correlations.find(c => c.x === xLabel && c.y === yLabel);
              const val = parseFloat(cell?.value || 0);
              const bg = val > 0 ? `rgba(37, 99, 235, ${Math.abs(val)})` : `rgba(219, 39, 119, ${Math.abs(val)})`;
              return (
                <div key={xLabel} className="p-1 flex items-center justify-center rounded" style={{ backgroundColor: bg, color: Math.abs(val) > 0.5 ? 'white' : 'black' }}>
                  {cell?.value}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    );
  };

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
              <div className="w-full h-48">
                {dashboardData && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="diet_type" />
                      <Tooltip />
                      <Bar dataKey="protein" fill="#2563eb" name="Protein" />
                      <Bar dataKey="carbs" fill="#16a34a" name="Carbs" />
                      <Bar dataKey="fat" fill="#7c3aed" name="Fat" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Scatter Plot Container */}
            <div className="bg-white p-4 shadow-lg rounded-lg">
              <h3 className="font-semibold text-lg">Scatter Plot</h3>
              <p className="text-sm text-gray-600 mb-2">Nutrient relationships (e.g., protein vs carbs).</p>
              <div className="w-full h-48">
                {dashboardData && (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid />
                      <XAxis type="number" dataKey="protein" name="protein" unit="g" />
                      <YAxis type="number" dataKey="carbs" name="carbs" unit="g" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Recipes" data={dashboardData.rawData} fill="#db2777" />
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Heatmap Container */}
            <div className="bg-white p-4 shadow-lg rounded-lg">
              <h3 className="font-semibold text-lg">Heatmap</h3>
              <p className="text-sm text-gray-600 mb-2">Nutrient correlations.</p>
              <div className="w-full h-48 flex flex-col justify-center">
                {renderHeatmap()}
              </div>
            </div>

            {/* Pie Chart Container */}
            <div className="bg-white p-4 shadow-lg rounded-lg">
              <h3 className="font-semibold text-lg">Pie Chart</h3>
              <p className="text-sm text-gray-600 mb-2">Recipe distribution by diet type.</p>
              <div className="w-full h-48">
                {dashboardData && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label>
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
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