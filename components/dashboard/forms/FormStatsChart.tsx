'use client'

interface ChartData {
  date: string
  label: string
  count: number
}

interface FormStatsChartProps {
  data: ChartData[]
}

export function FormStatsChart({ data }: FormStatsChartProps) {
  const maxCount = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="h-48">
      <div className="flex items-end justify-between h-full gap-1">
        {data.map((item, index) => {
          const height = (item.count / maxCount) * 100
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              {/* Bar */}
              <div className="w-full flex items-end justify-center h-36">
                <div
                  className="w-full max-w-8 bg-purple-500/80 rounded-t transition-all hover:bg-purple-400"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${item.count} Einsendungen`}
                />
              </div>
              {/* Label */}
              <span className="text-[10px] text-slate-500 whitespace-nowrap">
                {item.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
