import { PieChart, Pie, Cell, Tooltip } from "recharts";

const COLORS = ["#4CAF50", "#F44336", "#FF9800", "#2196F3", "#9C27B0"];

export default function StatsPieChart({ label, graphData }) {
  // const data = graphData.filter((d) => d.value > 0);
  const data = graphData;

  if (!data.length) {
    return (
      <div className="py-6 text-sm text-center text-gray-500">
        Aucune donnée disponible
      </div>
    );
  }

  return (
    <div className="w-full mx-auto bg-transparent shadow-sm rounded-xl">
      {/* Titre */}
      <p className="mb-4 font-semibold">{label}</p>

      {/* Chart */}
      <div className="flex justify-center">
        <PieChart width={300} height={280}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={95}
            innerRadius={60}
            paddingAngle={0.7}
            labelLine={false}
            label={({ percent }) =>
              percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""
            }
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke="#0B111E" // 👈 couleur du fond
                strokeWidth={2.5} // 👈 épaisseur du séparateur
              />
            ))}
          </Pie>

          <Tooltip
            contentStyle={{
              borderRadius: "10px",
              border: "1px solid #eee",
              fontSize: "12px",
            }}
          />
        </PieChart>
      </div>

      {/* Légende custom (beaucoup plus clean que Recharts) */}
      <div className="mt-4 space-y-2">
        {data.map((item, index) => {
          const total = data.reduce((sum, d) => sum + d.value, 0);
          const percent = ((item.value / total) * 100).toFixed(0);

          return (
            <div
              key={item.label}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-gray-400">{item.label}</span>
              </div>

              <span className="font-medium text-gray-400">
                {item.value} ({percent}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
