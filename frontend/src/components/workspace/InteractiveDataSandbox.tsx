'use client'

import React, { useState, useEffect } from 'react'

interface InteractiveDataSandboxProps {
  initialData: any
  onDataChange: (data: any) => void
}

export function InteractiveDataSandbox({ initialData, onDataChange }: InteractiveDataSandboxProps) {
  const [data, setData] = useState<any>(null)

  // Keep state synchronized with incoming initialData
  useEffect(() => {
    if (initialData) {
      setData(structuredClone(initialData))
    } else {
      setData(null)
    }
  }, [initialData])

  const updateValue = (path: (string | number)[], newValue: any) => {
    if (!data) return
    const cloned = structuredClone(data)
    
    let current = cloned
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]]
    }
    current[path[path.length - 1]] = newValue
    
    setData(cloned)
    if (onDataChange) {
      onDataChange(cloned)
    }
  }

  // Styling helper for table fields
  const getInputClassName = (value: string) => {
    const base = "w-full p-2 text-xs bg-transparent border-0 focus:ring-1 focus:ring-orange-500 rounded focus:outline-none transition-all font-mono"
    if (value === "PASS") {
      return `${base} bg-green-900/30 text-green-400 font-semibold`
    }
    if (value === "FAIL") {
      return `${base} bg-red-900/30 text-red-400 font-semibold`
    }
    if (value === "PCP") {
      return `${base} bg-amber-900/30 text-amber-400 font-semibold`
    }
    return `${base} text-zinc-300`
  }

  // Styling helper for flat primitive fields
  const getFlatInputClassName = (value: string) => {
    const base = "w-full p-2.5 text-xs bg-zinc-950 border border-zinc-800 focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 rounded-lg focus:outline-none transition-all font-medium"
    if (value === "PASS") {
      return `${base} bg-green-900/20 text-green-400 border-green-800/60 font-semibold`
    }
    if (value === "FAIL") {
      return `${base} bg-red-900/20 text-red-400 border-red-800/60 font-semibold`
    }
    if (value === "PCP") {
      return `${base} bg-amber-900/20 text-amber-400 border-amber-800/60 font-semibold`
    }
    return `${base} text-zinc-300`
  }

  const renderDataNode = (node: any, path: (string | number)[]): React.ReactNode => {
    if (node === null || node === undefined) {
      return (
        <input
          type="text"
          value=""
          onChange={(e) => updateValue(path, e.target.value)}
          className={getFlatInputClassName("")}
        />
      )
    }

    if (typeof node !== 'object') {
      return (
        <input
          type="text"
          value={String(node)}
          onChange={(e) => updateValue(path, e.target.value)}
          className={getFlatInputClassName(String(node))}
        />
      )
    }

    if (Array.isArray(node)) {
      if (node.length === 0) {
        return <div className="text-zinc-500 italic text-xs py-2 pl-3">Empty list</div>
      }

      // Check if elements are objects (tables) or primitives (simple inputs)
      const isArrayOfObjects = typeof node[0] === 'object' && node[0] !== null

      if (isArrayOfObjects) {
        const allKeys = Array.from(
          new Set(node.flatMap((item) => (item ? Object.keys(item) : [])))
        )

        return (
          <div className="overflow-x-auto w-full border border-zinc-800/60 rounded-xl bg-zinc-950/40">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3 w-12 text-center">#</th>
                  {allKeys.map((key) => (
                    <th key={key} className="p-3 border-l border-zinc-850">
                      {key.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {node.map((item, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-zinc-850 hover:bg-zinc-900/10 last:border-0 transition-colors"
                  >
                    <td className="p-3 text-zinc-500 text-center font-mono">{rowIndex + 1}</td>
                    {allKeys.map((key) => {
                      const val = item ? item[key] : ""
                      const isNested = val !== null && typeof val === 'object'
                      return (
                        <td key={key} className="p-1 border-l border-zinc-850/80">
                          {isNested ? (
                            <pre className="text-[10px] text-zinc-500 max-h-24 overflow-auto whitespace-pre font-mono p-1.5 bg-zinc-950/60 rounded leading-tight max-w-[200px] border border-zinc-900">
                              <code>{JSON.stringify(val, null, 2)}</code>
                            </pre>
                          ) : (
                            <input
                              type="text"
                              value={val === null || val === undefined ? "" : String(val)}
                              onChange={(e) => updateValue([...path, rowIndex, key], e.target.value)}
                              className={getInputClassName(val === null || val === undefined ? "" : String(val))}
                            />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      } else {
        return (
          <div className="space-y-2">
            {node.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-mono w-6">{index}:</span>
                <input
                  type="text"
                  value={item === null || item === undefined ? "" : String(item)}
                  onChange={(e) => updateValue([...path, index], e.target.value)}
                  className={getFlatInputClassName(item === null || item === undefined ? "" : String(item))}
                />
              </div>
            ))}
          </div>
        )
      }
    }

    const keys = Object.keys(node)
    const primitives: string[] = []
    const complex: string[] = []

    keys.forEach((key) => {
      const val = node[key]
      if (val === null || val === undefined || typeof val !== 'object') {
        primitives.push(key)
      } else {
        complex.push(key)
      }
    })

    return (
      <div className="space-y-6 w-full">
        {primitives.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {primitives.map((key) => (
              <div key={key} className="flex flex-col space-y-1.5 bg-zinc-950/20 p-3 rounded-xl border border-zinc-800/40">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  {key.replace(/_/g, ' ')}
                </label>
                <input
                  type="text"
                  value={node[key] === null || node[key] === undefined ? "" : String(node[key])}
                  onChange={(e) => updateValue([...path, key], e.target.value)}
                  className={getFlatInputClassName(node[key] === null || node[key] === undefined ? "" : String(node[key]))}
                />
              </div>
            ))}
          </div>
        )}

        {complex.map((key) => (
          <div key={key} className="space-y-2 border-t border-zinc-800/40 pt-4">
            <h4 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
              {key.replace(/_/g, ' ')}
            </h4>
            <div className="pl-3">
              {renderDataNode(node[key], [...path, key])}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-500 text-xs italic">
        No editable data loaded.
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      {renderDataNode(data, [])}
    </div>
  )
}
