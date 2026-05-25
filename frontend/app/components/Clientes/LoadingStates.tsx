import React from "react";
import { ThemeColors } from "./ClientesComuns";

export function LoadingStats({ colors }: { colors: ThemeColors }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 rounded-full gap-3">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="p-4 border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10"
              style={{ backgroundColor: colors.border }}
            />
            <div className="space-y-1.5">
              <div
                className="h-5 w-10"
                style={{ backgroundColor: colors.border }}
              />
              <div
                className="h-3.5 w-14"
                style={{ backgroundColor: colors.border }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoadingTabela({ colors }: { colors: ThemeColors }) {
  return (
    <div
      className="border overflow-hidden"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
    >
      <div className="h-11" style={{ backgroundColor: colors.primary }} />
      <div className="divide-y" style={{ borderColor: colors.border }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5">
            <div
              className="w-9 h-9"
              style={{ backgroundColor: colors.border }}
            />
            <div className="flex-1 space-y-1.5">
              <div
                className="h-3.5 w-36"
                style={{ backgroundColor: colors.border }}
              />
              <div
                className="h-3 w-28"
                style={{ backgroundColor: colors.border }}
              />
            </div>
            <div
              className="w-20 h-6"
              style={{ backgroundColor: colors.border }}
            />
            <div
              className="w-20 h-6"
              style={{ backgroundColor: colors.border }}
            />
            <div
              className="w-28 h-4"
              style={{ backgroundColor: colors.border }}
            />
            <div className="flex gap-1.5">
              {[...Array(3)].map((_, j) => (
                <div
                  key={j}
                  className="w-8 h-8"
                  style={{ backgroundColor: colors.border }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}