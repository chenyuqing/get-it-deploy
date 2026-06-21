"use client"

/**
 * Public viewer component for shared visualizations.
 * Read-only, no login required.
 */

import { useState } from "react"
import type { VizSpec } from "@/lib/schemas"
import ThreeDView from "@/components/Visualizer/ThreeDView"
import TwoDAnimView from "@/components/Visualizer/TwoDAnimView"
import TwoDTextView from "@/components/Visualizer/TwoDTextView"
import FormulaView from "@/components/Visualizer/FormulaView"
import GraphView from "@/components/Visualizer/GraphView"
import { VIZ_TYPE_META, vizTypeStyle } from "@/components/Visualizer/viz-meta"

type Tag = {
  id: string
  label: string
  page: number
  spec: VizSpec | null
  ready: boolean
}

type Props = {
  document: {
    filename: string
    numPages: number
  }
  tags: Tag[]
}

export default function PublicViewer({ document, tags }: Props) {
  const [activeTagId, setActiveTagId] = useState<string | null>(
    tags.find(t => t.ready)?.id || null
  )

  const activeTag = tags.find(t => t.id === activeTagId)
  const activeSpec = activeTag?.spec

  return (
    <div className="flex h-screen flex-col bg-[#F6F1E8]">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-[#E2D9C8] bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-[#1F2421]">
            {document.filename.replace(/\.pdf$/i, "")}
          </h1>
          <p className="text-sm text-[#8A8A80]">
            {tags.length} visualization{tags.length !== 1 ? "s" : ""} shared
          </p>
        </div>
        <div className="rounded-lg bg-[#F0E3D0] px-3 py-1 text-xs font-medium text-[#C8853F]">
          Public Share
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-[#E2D9C8] bg-white">
          <div className="p-4">
            <h2 className="mb-3 text-sm font-medium text-[#1F2421]">
              Visualizations
            </h2>
            <div className="space-y-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setActiveTagId(tag.id)}
                  disabled={!tag.ready}
                  className={`flex w-full items-start gap-2 rounded-lg border p-3 text-left transition ${
                    activeTagId === tag.id
                      ? "border-[#C8853F] bg-[#F0E3D0]"
                      : tag.ready
                        ? "border-[#E2D9C8] bg-white hover:border-[#C8853F]"
                        : "border-[#E2D9C8] bg-gray-50 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#1F2421]">
                      {tag.label}
                    </p>
                    <p className="mt-1 text-xs text-[#8A8A80]">
                      Page {tag.page + 1}
                    </p>
                    {tag.spec && VIZ_TYPE_META[tag.spec.type] && (
                      <span
                        className="mt-2 inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
                        style={vizTypeStyle(tag.spec.type)}
                      >
                        {(() => {
                          const Icon = VIZ_TYPE_META[tag.spec.type].Icon
                          return <Icon className="h-3 w-3" />
                        })()}
                        {VIZ_TYPE_META[tag.spec.type].label}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Viewer */}
        <main className="flex-1 bg-white">
          {activeSpec ? (
            <div className="h-full">
              {activeSpec.type === "3d" && <ThreeDView spec={activeSpec} />}
              {activeSpec.type === "2d-anim" && <TwoDAnimView spec={activeSpec} />}
              {activeSpec.type === "2d-text" && <TwoDTextView spec={activeSpec} />}
              {activeSpec.type === "formula" && <FormulaView spec={activeSpec} />}
              {activeSpec.type === "graph" && <GraphView spec={activeSpec} />}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <p className="text-sm text-[#8A8A80]">
                  Select a visualization to view
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
