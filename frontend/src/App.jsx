import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter
} from 'recharts';
import { useAuth } from './AuthContext';
import AuthPage from './AuthPage';

const COLORS = ['#2563eb', '#16a34a', '#7c3aed', '#db2777', '#f97316'];
const ITEMS_PER_PAGE = 10;

const API_URL = import.meta.env.VITE_API_URL;
const RECIPES_URL = import.meta.env.VITE_RECIPES_URL;

function Dashboard() {
  const { user, token, logout } = useAuth();

  // Analytics state (charts — loaded once from cache)
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(null);

  // Recipes state (server-side filtered + paginated)
  const [recipesData, setRecipesData] = useState({ recipes: [], pagination: { totalCount: 0, totalPages: 1 } });
  const [recipesLoading, setRecipesLoading] = useState(false);

  // Scatter plot uses a small slice of the last recipe fetch
  const [scatterData, setScatterData] = useState([]);

  // Interaction controls
  const [searchTerm, setSearchTerm] = useState('');
  const [dietFilter, setDietFilter] = useState('all');
  const [activeView, setActiveView] = useState('insights');
  const [currentPage, setCurrentPage] = useState(1);

  // ── Fetch analytics (charts) once on mount ─────────────────────────────────
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(API_URL, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setAnalyticsData(data);

        // Pre-load scatter data from a broad recipe fetch on first load
        setScatterData([]);
      } catch (err) {
        setAnalyticsError(err.message);
      } finally {
        setAnalyticsLoading(false);
      }
    };
    fetchAnalytics();
  }, [token]);

  // ── Fetch recipes (server-side, triggered by filter/page changes) ───────────
  const fetchRecipes = useCallback(async (page, search, diet) => {
    setRecipesLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(ITEMS_PER_PAGE),
        search: search.trim(),
        dietFilter: diet
      });
      const res = await fetch(`${RECIPES_URL}?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRecipesData(data);
      // Use first 200 results from this fetch for the scatter plot
      if (page === 1) setScatterData(data.recipes.slice(0, 200));
    } catch (err) {
      console.error('Recipe fetch error:', err.message);
    } finally {
      setRecipesLoading(false);
    }
  }, [token]);

  // Initial recipe load + whenever filters or page change
  useEffect(() => {
    fetchRecipes(currentPage, searchTerm, dietFilter);
  }, [fetchRecipes, currentPage, searchTerm, dietFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dietFilter]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const pieData = analyticsData?.dietDistribution
    ? Object.entries(analyticsData.dietDistribution).map(([name, value]) => ({ name, value }))
    : [];

  const barData = analyticsData?.dietAverages
    ? analyticsData.dietAverages.map(d => ({
        ...d,
        protein: parseFloat(d.protein),
        carbs: parseFloat(d.carbs),
        fat: parseFloat(d.fat)
      }))
    : [];

  const filteredBarData = barData.filter(d =>
    dietFilter === 'all' || d.diet_type?.toLowerCase() === dietFilter
  );

  const { recipes: paginatedData, pagination } = recipesData;
  const { totalCount, totalPages } = pagination;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  // ── Heatmap renderer ────────────────────────────────────────────────────────
  const renderHeatmap = () => {
    if (!analyticsData?.correlations)
      return <div style={{ color: '#FF8B5A', opacity: 0.5 }}>Loading...</div>;
    return (
      <div className="grid grid-cols-4 gap-1 text-xs text-center h-full" style={{ color: '#1a0f0f' }}>
        <div className="font-bold p-1" />
        {['Protein', 'Carbs', 'Fat'].map(l => (
          <div key={l} className="font-bold p-1 flex items-center justify-center" style={{ borderBottom: '1px solid #e5e7eb' }}>{l}</div>
        ))}
        {['Protein', 'Carbs', 'Fat'].map(yLabel => (
          <React.Fragment key={yLabel}>
            <div className="font-bold p-1 flex items-center justify-center" style={{ borderRight: '1px solid #e5e7eb' }}>{yLabel}</div>
            {['Protein', 'Carbs', 'Fat'].map(xLabel => {
              const cell = analyticsData.correlations.find(c => c.x === xLabel && c.y === yLabel);
              const val = parseFloat(cell?.value || 0);
              const bg = val > 0 ? `rgba(37,99,235,${Math.abs(val)})` : `rgba(219,39,119,${Math.abs(val)})`;
              return (
                <div key={xLabel} className="p-1 flex items-center justify-center rounded"
                  style={{ backgroundColor: bg, color: Math.abs(val) > 0.5 ? 'white' : '#1a0f0f' }}>
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
      <header className="p-4 md:p-6 rounded-2xl shadow-lg flex items-center justify-between" style={{ backgroundColor: '#2a1515' }}>
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#FFA95A' }}>
          Nutritional Insights Dashboard
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm hidden sm:block" style={{ color: '#FFA95A' }}>
            {user?.name}
          </span>
          <button
            onClick={logout}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#5c2020', border: '1px solid #FF5A5A', color: '#f5e6e0', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main
        className="max-w-7xl mx-auto w-full p-6 md:p-8 rounded-2xl"
        style={{
          backgroundColor: '#2a1a1a',
          boxShadow: '0 0 40px rgba(255,90,90,0.12), 0 0 80px rgba(255,139,90,0.08)'
        }}
      >

        {/* CHARTS */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: '#FFA95A' }}>Explore Nutritional Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Bar Chart */}
            <div className="p-4 md:p-6 rounded-xl" style={{ backgroundColor: '#fafafa', border: '1px solid #FF5A5A' }}>
              <div className="w-full h-52">
                {analyticsData ? (
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
                    {analyticsLoading ? 'Loading...' : 'No data'}
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-lg mt-2" style={{ color: '#FF5A5A' }}>Bar Chart</h3>
              <p className="text-sm" style={{ color: '#FF8B5A' }}>Average macronutrient content by diet type.</p>
            </div>

            {/* Scatter Plot */}
            <div className="p-4 md:p-6 rounded-xl" style={{ backgroundColor: '#fafafa', border: '1px solid #FF5A5A' }}>
              <div className="w-full h-52">
                {scatterData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid />
                      <XAxis type="number" dataKey="protein" name="Protein" unit="g" />
                      <YAxis type="number" dataKey="carbs" name="Carbs" unit="g" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Recipes" data={scatterData} fill="#2563eb" />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    {recipesLoading ? 'Loading...' : 'No data'}
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-lg mt-2" style={{ color: '#FF5A5A' }}>Scatter Plot</h3>
              <p className="text-sm" style={{ color: '#FF8B5A' }}>Nutrient relationships (protein vs carbs).</p>
            </div>

            {/* Heatmap */}
            <div className="p-4 md:p-6 rounded-xl" style={{ backgroundColor: '#fafafa', border: '1px solid #FF5A5A' }}>
              <div className="w-full h-52 flex flex-col justify-center">{renderHeatmap()}</div>
              <h3 className="font-semibold text-lg mt-2" style={{ color: '#FF5A5A' }}>Heatmap</h3>
              <p className="text-sm" style={{ color: '#FF8B5A' }}>Nutrient correlations.</p>
            </div>

            {/* Pie Chart */}
            <div className="p-4 md:p-6 rounded-xl" style={{ backgroundColor: '#fafafa', border: '1px solid #FF5A5A' }}>
              <div className="w-full h-52">
                {analyticsData ? (
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
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    {analyticsLoading ? 'Loading...' : 'No data'}
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-lg mt-2" style={{ color: '#FF5A5A' }}>Pie Chart</h3>
              <p className="text-sm" style={{ color: '#FF8B5A' }}>Recipe distribution by diet type.</p>
            </div>

          </div>
        </section>

        {/* FILTERS */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: '#FFA95A' }}>Filters and Data Interaction</h2>
          <div className="flex flex-wrap gap-4">
            <input
              type="text"
              placeholder="Search recipes by name or keyword"
              className="p-2 rounded w-full sm:w-72 focus:outline-none"
              style={{ backgroundColor: '#3a2020', border: '1px solid #FF5A5A', color: '#f5e6e0' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <select
              className="p-2 rounded w-full sm:w-48 focus:outline-none"
              style={{ backgroundColor: '#3a2020', border: '1px solid #FF5A5A', color: '#f5e6e0' }}
              value={dietFilter}
              onChange={e => setDietFilter(e.target.value)}
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

        {/* VIEW TABS */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: '#FFA95A' }}>API Data Interaction</h2>
          <div className="flex flex-wrap gap-4">
            {['insights', 'recipes', 'clusters'].map(view => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className="py-2 px-5 rounded font-medium transition-all capitalize"
                style={{
                  backgroundColor: activeView === view ? '#FF5A5A' : '#5c2020',
                  color: activeView === view ? '#fff' : '#f5e6e0',
                  border: '1px solid #FF5A5A'
                }}
              >
                {view === 'insights' ? 'Get Nutritional Insights' : view === 'recipes' ? 'Get Recipes' : 'Get Clusters'}
              </button>
            ))}
          </div>
        </section>

        {/* INSIGHTS TABLE */}
        {activeView === 'insights' && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-2" style={{ color: '#FFA95A' }}>Nutritional Insights</h2>
            <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #5c2020' }}>
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr style={{ borderBottom: '2px solid #FF5A5A' }}>
                    {['Diet Type', 'Avg Protein (g)', 'Avg Carbs (g)', 'Avg Fat (g)'].map(h => (
                      <th key={h} className="py-3 px-4 font-semibold" style={{ color: '#FFA95A' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBarData.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #3a2020' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,90,90,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td className="py-2 px-4 capitalize">{r.diet_type || '-'}</td>
                      <td className="py-2 px-4 text-right">{parseFloat(r.protein).toFixed(2)}</td>
                      <td className="py-2 px-4 text-right">{parseFloat(r.carbs).toFixed(2)}</td>
                      <td className="py-2 px-4 text-right">{parseFloat(r.fat).toFixed(2)}</td>
                    </tr>
                  ))}
                  {filteredBarData.length === 0 && (
                    <tr><td colSpan="4" className="py-4 text-center text-gray-400">No data available</td></tr>
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
              Recipes {recipesLoading ? '(loading...)' : `(Page ${currentPage} of ${totalPages || 1})`}
            </h2>
            <p className="text-sm mb-4" style={{ color: '#FF8B5A' }}>{totalCount} total results</p>
            <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #5c2020' }}>
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr style={{ borderBottom: '2px solid #FF5A5A' }}>
                    {['Recipe', 'Diet', 'Cuisine', 'Protein', 'Carbs', 'Fat'].map(h => (
                      <th key={h} className="py-3 px-4 font-semibold" style={{ color: '#FFA95A' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #3a2020' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,90,90,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td className="py-2 px-4">{r.recipe || '-'}</td>
                      <td className="py-2 px-4 capitalize">{r.diet || '-'}</td>
                      <td className="py-2 px-4">{r.cuisine || '-'}</td>
                      <td className="py-2 px-4 text-right">{parseFloat(r.protein).toFixed(2)}</td>
                      <td className="py-2 px-4 text-right">{parseFloat(r.carbs).toFixed(2)}</td>
                      <td className="py-2 px-4 text-right">{parseFloat(r.fat).toFixed(2)}</td>
                    </tr>
                  ))}
                  {paginatedData.length === 0 && !recipesLoading && (
                    <tr><td colSpan="6" className="py-4 text-center text-gray-400">No recipes found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* CLUSTERS */}
        {activeView === 'clusters' && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-2" style={{ color: '#FFD45A' }}>Clusters View</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {analyticsData?.clusters ? analyticsData.clusters.map((c, i) => (
                <div key={i} className="p-6 rounded-xl text-center" style={{ backgroundColor: '#2a1515', border: `1px solid ${COLORS[i % COLORS.length]}` }}>
                  <h3 className="text-xl font-bold mb-2" style={{ color: COLORS[i % COLORS.length] }}>{c.name}</h3>
                  <p className="text-3xl font-bold mb-4" style={{ color: '#f5e6e0' }}>{c.count} <span className="text-sm font-normal opacity-70">recipes</span></p>
                  <div className="flex justify-between text-sm px-4">
                    <div><p style={{ color: '#FF5A5A' }}>Protein</p><p className="font-bold">{c.protein}g</p></div>
                    <div><p style={{ color: '#FF8B5A' }}>Carbs</p><p className="font-bold">{c.carbs}g</p></div>
                    <div><p style={{ color: '#FFA95A' }}>Fat</p><p className="font-bold">{c.fat}g</p></div>
                  </div>
                </div>
              )) : (
                <div className="col-span-3 p-10 text-center" style={{ color: '#FF8B5A' }}>Loading cluster data...</div>
              )}
            </div>
          </section>
        )}

        {/* PAGINATION */}
        <section className="mb-4 mt-8">
          <h2 className="text-lg font-semibold mb-4 text-center" style={{ color: '#FF8B5A' }}>Pagination</h2>
          <div className="flex justify-center gap-2 flex-wrap">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="px-4 py-2 rounded font-medium"
              style={{ backgroundColor: currentPage === 1 ? '#3a2020' : '#5c2020', color: currentPage === 1 ? '#6b4040' : '#f5e6e0', border: '1px solid #5c2020', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>
              Previous
            </button>
            {getPageNumbers().map(page => (
              <button key={page} onClick={() => setCurrentPage(page)}
                className="px-4 py-2 rounded font-medium"
                style={{ backgroundColor: currentPage === page ? '#FF5A5A' : '#5c2020', color: currentPage === page ? '#fff' : '#f5e6e0', border: '1px solid #FF5A5A' }}>
                {page}
              </button>
            ))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}
              className="px-4 py-2 rounded font-medium"
              style={{ backgroundColor: (currentPage === totalPages || totalPages === 0) ? '#3a2020' : '#5c2020', color: (currentPage === totalPages || totalPages === 0) ? '#6b4040' : '#f5e6e0', border: '1px solid #5c2020', cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer' }}>
              Next
            </button>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="p-4 text-center" style={{ backgroundColor: '#2a1515', color: '#FFA95A' }}>
        <p>&copy; 2025 Nutritional Insights. All Rights Reserved.</p>
        <p className="text-sm mt-1 opacity-70">
          {analyticsLoading ? 'Fetching data from Azure...' :
            analyticsError ? `Error: ${analyticsError}` :
              analyticsData ? `Backend Execution Time: ${analyticsData.metadata?.executionTimeMs} | Source: ${analyticsData.metadata?.source}` :
                'No data available'}
        </p>
      </footer>
    </div>
  );
}

function App() {
  const { token, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a0f0f', color: '#FFA95A' }}>
        Loading...
      </div>
    );
  }

  return token ? <Dashboard /> : <AuthPage />;
}

export default App;
