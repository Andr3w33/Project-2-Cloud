import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter
} from 'recharts';

const COLORS = ['#2563eb', '#16a34a', '#7c3aed', '#db2777', '#f97316'];
const ITEMS_PER_PAGE = 10;

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dietFilter, setDietFilter] = useState('all');
  const [activeView, setActiveView] = useState('insights');
  const [currentPage, setCurrentPage] = useState(1);

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNutritionalData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        if (!apiUrl) throw new Error("API URL is missing. Check your .env file!");

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

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

  // Transform Data
  const pieData = dashboardData && dashboardData.dietDistribution ? Object.keys(dashboardData.dietDistribution).map(key => ({
    name: key,
    value: dashboardData.dietDistribution[key]
  })) : [];

  const barData = dashboardData && dashboardData.dietAverages ? dashboardData.dietAverages.map(d => ({
    ...d,
    protein: parseFloat(d.protein),
    carbs: parseFloat(d.carbs),
    fat: parseFloat(d.fat)
  })) : [];

  // Filter Data
  const filteredBarData = barData.filter(d => {
    return dietFilter === 'all' || d.diet_type?.toLowerCase() === dietFilter.toLowerCase();
  });

  const filteredRawData = dashboardData ? dashboardData.rawData.filter(d => {
    const matchesSearch = d.recipe?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchesDropdown = dietFilter === 'all' || d.diet?.toLowerCase() === dietFilter.toLowerCase();
    return matchesSearch && matchesDropdown;
  }) : [];

  // Pagination
  const totalPages = Math.ceil(filteredRawData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredRawData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dietFilter]);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Render Correlational Heatmap
  const renderHeatmap = () => {
    if (!dashboardData || !dashboardData.correlations) return <div style={{ color: '#FF8B5A', opacity: 0.5 }}>Loading...</div>;
    return (
      <div className="grid grid-cols-4 gap-1 text-xs text-center h-full" style={{ color: '#1a0f0f' }}>
        <div className="font-bold p-1"></div>
        <div className="font-bold p-1 flex items-center justify-center" style={{ borderBottom: '1px solid #e5e7eb' }}>Protein</div>
        <div className="font-bold p-1 flex items-center justify-center" style={{ borderBottom: '1px solid #e5e7eb' }}>Carbs</div>
        <div className="font-bold p-1 flex items-center justify-center" style={{ borderBottom: '1px solid #e5e7eb' }}>Fat</div>

        {['Protein', 'Carbs', 'Fat'].map(yLabel => (
          <React.Fragment key={yLabel}>
            <div className="font-bold p-1 flex items-center justify-center" style={{ borderRight: '1px solid #e5e7eb' }}>{yLabel}</div>
            {['Protein', 'Carbs', 'Fat'].map(xLabel => {
              const cell = dashboardData.correlations.find(c => c.x === xLabel && c.y === yLabel);
              const val = parseFloat(cell?.value || 0);
              // Old chart coloring: Blue for positive, pink for negative
              const bg = val > 0 ? `rgba(37, 99, 235, ${Math.abs(val)})` : `rgba(219, 39, 119, ${Math.abs(val)})`;
              return (
                <div key={xLabel} className="p-1 flex items-center justify-center rounded transition-colors" style={{ backgroundColor: bg, color: Math.abs(val) > 0.5 ? 'white' : '#1a0f0f' }}>
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
    <div className="min-h-screen font-sans p-4 md:p-8 flex flex-col gap-6" style={{ backgroundColor: '#1a0f0f', color: '#f5e6e0' }}>

      {/* HEADER */}
      <header className="p-6 rounded-2xl shadow-lg text-center" style={{ backgroundColor: '#2a1515' }}>
        <h1 className="text-3xl font-bold" style={{ color: '#FFA95A' }}>
          🥗 Nutritional Insights Dashboard
        </h1>
      </header>

      {/* MAIN CONTAINER with glow */}
      <main
        className="max-w-7xl mx-auto w-full p-6 md:p-8 rounded-2xl"
        style={{
          backgroundColor: '#2a1a1a',
          boxShadow: '0 0 40px rgba(255, 90, 90, 0.12), 0 0 80px rgba(255, 139, 90, 0.08)'
        }}
      >

        {/* CHARTS SECTION */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: '#FFA95A' }}>
            Explore Nutritional Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Bar Chart */}
            <div className="p-4 md:p-6 rounded-xl" style={{ backgroundColor: '#fafafa', border: '1px solid #FF5A5A' }}>
              <div className="w-full h-52">
                {dashboardData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredBarData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="diet_type" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="protein" fill="#2563eb" name="Protein(g)" />
                      <Bar dataKey="carbs" fill="#f97316" name="Carbs(g)" />
                      <Bar dataKey="fat" fill="#16a34a" name="Fat(g)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    {loading ? 'Loading...' : 'No data'}
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-lg mt-2" style={{ color: '#FF5A5A' }}>Bar Chart</h3>
              <p className="text-sm" style={{ color: '#FF8B5A' }}>Average macronutrient content by diet type.</p>
            </div>

            {/* Scatter Plot */}
            <div className="p-4 md:p-6 rounded-xl" style={{ backgroundColor: '#fafafa', border: '1px solid #FF5A5A' }}>
              <div className="w-full h-52">
                {dashboardData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid />
                      <XAxis type="number" dataKey="protein" name="Protein" unit="g" />
                      <YAxis type="number" dataKey="carbs" name="Carbs" unit="g" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Recipes" data={filteredRawData.slice(0, 200)} fill="#2563eb" />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    {loading ? 'Loading...' : 'No data'}
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-lg mt-2" style={{ color: '#FF5A5A' }}>Scatter Plot</h3>
              <p className="text-sm" style={{ color: '#FF8B5A' }}>Nutrient relationships (e.g., protein vs carbs).</p>
            </div>

            {/* Heatmap */}
            <div className="p-4 md:p-6 rounded-xl" style={{ backgroundColor: '#fafafa', border: '1px solid #FF5A5A' }}>
              <div className="w-full h-52 flex flex-col justify-center">
                {renderHeatmap()}
              </div>
              <h3 className="font-semibold text-lg mt-2" style={{ color: '#FF5A5A' }}>Heatmap</h3>
              <p className="text-sm" style={{ color: '#FF8B5A' }}>Nutrient correlations.</p>
            </div>

            {/* Pie Chart */}
            <div className="p-4 md:p-6 rounded-xl" style={{ backgroundColor: '#fafafa', border: '1px solid #FF5A5A' }}>
              <div className="w-full h-52">
                {dashboardData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        outerRadius={70}
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          return percent > 0.05 ? (
                            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
                              {`${(percent * 100).toFixed(0)}%`}
                            </text>
                          ) : null;
                        }}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    {loading ? 'Loading...' : 'No data'}
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-lg mt-2" style={{ color: '#FF5A5A' }}>Pie Chart</h3>
              <p className="text-sm" style={{ color: '#FF8B5A' }}>Recipe distribution by diet type.</p>
            </div>

          </div>
        </section>

        {/* FILTERS AND DATA INTERACTION */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: '#FFA95A' }}>
            Filters and Data Interaction
          </h2>
          <div className="flex flex-wrap gap-4">
            <input
              type="text"
              placeholder="Search recipes by Diet Type"
              className="p-2 rounded w-full sm:w-64 focus:outline-none focus:ring-2"
              style={{ backgroundColor: '#3a2020', border: '1px solid #FF5A5A', color: '#f5e6e0', focusRingColor: '#FF5A5A' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="p-2 rounded w-full sm:w-48 focus:outline-none focus:ring-2"
              style={{ backgroundColor: '#3a2020', border: '1px solid #FF5A5A', color: '#f5e6e0' }}
              value={dietFilter}
              onChange={(e) => setDietFilter(e.target.value)}
            >
              <option value="all">All Diet Types</option>
              <option value="vegan">Vegan</option>
              <option value="keto">Keto</option>
              <option value="mediterranean">Mediterranean</option>
              <option value="dash">Dash</option>
              <option value="paleo">Paleo</option>
            </select>
          </div>
        </section>

        {/* API DATA INTERACTION */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: '#FFA95A' }}>
            API Data Interaction
          </h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setActiveView('insights')}
              className="py-2 px-5 rounded font-medium transition-all"
              style={{
                backgroundColor: activeView === 'insights' ? '#FF5A5A' : '#5c2020',
                color: activeView === 'insights' ? '#fff' : '#f5e6e0',
                border: '1px solid #FF5A5A'
              }}
            >
              {loading && activeView === 'insights' ? 'Loading...' : 'Get Nutritional Insights'}
            </button>
            <button
              onClick={() => setActiveView('recipes')}
              className="py-2 px-5 rounded font-medium transition-all"
              style={{
                backgroundColor: activeView === 'recipes' ? '#FF5A5A' : '#5c2020',
                color: activeView === 'recipes' ? '#fff' : '#f5e6e0',
                border: '1px solid #FF5A5A'
              }}
            >
              {loading && activeView === 'recipes' ? 'Loading...' : 'Get Recipes'}
            </button>
            <button
              onClick={() => setActiveView('clusters')}
              className="py-2 px-5 rounded font-medium transition-all"
              style={{
                backgroundColor: activeView === 'clusters' ? '#FF5A5A' : '#5c2020',
                color: activeView === 'clusters' ? '#1a0f0f' : '#f5e6e0',
                border: '1px solid #FF5A5A'
              }}
            >
              Get Clusters
            </button>
          </div>
        </section>

        {/* NUTRITIONAL INSIGHTS TABLE */}
        {activeView === 'insights' && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-2" style={{ color: '#FFA95A' }}>
              Nutritional Insights
            </h2>
            <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #5c2020' }}>
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr style={{ borderBottom: '2px solid #FF5A5A' }}>
                    <th className="py-3 px-4 font-semibold" style={{ color: '#FFA95A' }}>Diet Type</th>
                    <th className="py-3 px-4 font-semibold text-right" style={{ color: '#FFA95A' }}>Avg Protein (g)</th>
                    <th className="py-3 px-4 font-semibold text-right" style={{ color: '#FFA95A' }}>Avg Carbs (g)</th>
                    <th className="py-3 px-4 font-semibold text-right" style={{ color: '#FFA95A' }}>Avg Fat (g)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBarData.map((r, i) => (
                    <tr key={i} className="transition-colors" style={{ borderBottom: '1px solid #3a2020' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 90, 90, 0.08)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td className="py-2 px-4 capitalize">{r.diet_type || '-'}</td>
                      <td className="py-2 px-4 text-right">{parseFloat(r.protein)?.toFixed(2) || 0}</td>
                      <td className="py-2 px-4 text-right">{parseFloat(r.carbs)?.toFixed(2) || 0}</td>
                      <td className="py-2 px-4 text-right">{parseFloat(r.fat)?.toFixed(2) || 0}</td>
                    </tr>
                  ))}
                  {filteredBarData.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-4 text-center text-gray-400">No data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* RECIPES TABLE */}
        {activeView === 'recipes' && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-2" style={{ color: '#FFA95A' }}>
              Recipes (Page {currentPage} of {totalPages || 1})
            </h2>
            <p className="text-sm mb-4" style={{ color: '#FF8B5A' }}>{filteredRawData.length} total results</p>
            <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #5c2020' }}>
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr style={{ borderBottom: '2px solid #FF5A5A' }}>
                    <th className="py-3 px-4 font-semibold" style={{ color: '#FFA95A' }}>Recipe</th>
                    <th className="py-3 px-4 font-semibold" style={{ color: '#FFA95A' }}>Diet</th>
                    <th className="py-3 px-4 font-semibold" style={{ color: '#FFA95A' }}>Cuisine</th>
                    <th className="py-3 px-4 font-semibold text-right" style={{ color: '#FFA95A' }}>Protein</th>
                    <th className="py-3 px-4 font-semibold text-right" style={{ color: '#FFA95A' }}>Carbs</th>
                    <th className="py-3 px-4 font-semibold text-right" style={{ color: '#FFA95A' }}>Fat</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((r, i) => (
                    <tr key={i} className="transition-colors" style={{ borderBottom: '1px solid #3a2020' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 90, 90, 0.08)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td className="py-2 px-4">{r.recipe || '-'}</td>
                      <td className="py-2 px-4">{r.diet || '-'}</td>
                      <td className="py-2 px-4">{r.cuisine || '-'}</td>
                      <td className="py-2 px-4 text-right">{parseFloat(r.protein)?.toFixed(2) || 0}</td>
                      <td className="py-2 px-4 text-right">{parseFloat(r.carbs)?.toFixed(2) || 0}</td>
                      <td className="py-2 px-4 text-right">{parseFloat(r.fat)?.toFixed(2) || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeView === 'clusters' && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-2" style={{ color: '#FFD45A' }}>
              Clusters View
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {dashboardData && dashboardData.clusters ? dashboardData.clusters.map((c, i) => (
                <div key={i} className="p-6 rounded-xl text-center" style={{ backgroundColor: '#2a1515', border: `1px solid ${COLORS[i % COLORS.length]}` }}>
                  <h3 className="text-xl font-bold mb-2" style={{ color: COLORS[i % COLORS.length] }}>{c.name}</h3>
                  <p className="text-3xl font-bold mb-4" style={{ color: '#f5e6e0' }}>{c.count} <span className="text-sm font-normal opacity-70">recipes</span></p>

                  <div className="flex justify-between text-sm px-4">
                    <div>
                      <p style={{ color: '#FF5A5A' }}>Protein</p>
                      <p className="font-bold">{c.protein}g</p>
                    </div>
                    <div>
                      <p style={{ color: '#FF8B5A' }}>Carbs</p>
                      <p className="font-bold">{c.carbs}g</p>
                    </div>
                    <div>
                      <p style={{ color: '#FFA95A' }}>Fat</p>
                      <p className="font-bold">{c.fat}g</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-3 p-10 text-center" style={{ color: '#FF8B5A' }}>Loading cluster data from Azure...</div>
              )}
            </div>
          </section>
        )}

        {/* PAGINATION */}
        <section className="mb-4 mt-8">
          <h2 className="text-lg font-semibold mb-4 text-center" style={{ color: '#FF8B5A' }}>Pagination</h2>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded font-medium transition-all"
              style={{
                backgroundColor: currentPage === 1 ? '#3a2020' : '#5c2020',
                color: currentPage === 1 ? '#6b4040' : '#f5e6e0',
                border: '1px solid #5c2020',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            {getPageNumbers().map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className="px-4 py-2 rounded font-medium transition-all"
                style={{
                  backgroundColor: currentPage === page ? '#FF5A5A' : '#5c2020',
                  color: currentPage === page ? '#ffffff' : '#f5e6e0',
                  border: `1px solid ${currentPage === page ? '#FF5A5A' : '#FF5A5A'}`
                }}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-4 py-2 rounded font-medium transition-all"
              style={{
                backgroundColor: (currentPage === totalPages || totalPages === 0) ? '#3a2020' : '#5c2020',
                color: (currentPage === totalPages || totalPages === 0) ? '#6b4040' : '#f5e6e0',
                border: '1px solid #5c2020',
                cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="p-4 text-center" style={{ backgroundColor: '#2a1515', color: '#FFA95A' }}>
        <p>&copy; 2025 Nutritional Insights. All Rights Reserved.</p>
        <p className="text-sm mt-1 opacity-70">
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