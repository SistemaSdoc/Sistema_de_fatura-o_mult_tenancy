"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Trash2, PencilLine, MoreVertical, Clock } from "lucide-react";
import { Produto, formatarPreco } from "@/services/produtos";
import { useThemeColors, LIGHT_COLORS } from "@/context/ThemeContext";
import { color } from "motion-dom";

interface TabelaServicosProps {
  itens: Produto[];
  onMoverParaLixeira: (item: Produto) => void;
  onEditar: (item: Produto) => void;
  colors?: typeof LIGHT_COLORS;
}

export function TabelaServicos({ itens, onMoverParaLixeira, onEditar, colors: propColors }: TabelaServicosProps) {
  const contextColors = useThemeColors();
  const colors = propColors || contextColors;

  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        const button = buttonRefs.current.get(menuId || "");
        const isButtonClick = button?.contains(target);
        if (!isButtonClick) {
          setMenuId(null);
          setMenuPosition(null);
          setMenuOpen(false);
        }
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuId(null);
        setMenuPosition(null);
        setMenuOpen(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen, menuId]);

  const toggleMenu = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
      e.preventDefault();
      e.stopPropagation();

      if (menuId === id && menuOpen) {
        setMenuId(null);
        setMenuPosition(null);
        setMenuOpen(false);
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const menuWidth = 176;
      const menuHeight = 110;

      let left = rect.left;
      if (left + menuWidth > windowWidth - 10) {
        left = rect.right - menuWidth;
      }
      if (left < 10) {
        left = 10;
      }

      let top = rect.bottom + 6;
      if (top + menuHeight > windowHeight - 10) {
        top = rect.top - menuHeight - 6;
      }

      setMenuId(id);
      setMenuPosition({ top, left });
      setMenuOpen(true);
    },
    [menuId, menuOpen]
  );

  const fecharMenu = useCallback(() => {
    setMenuId(null);
    setMenuPosition(null);
    setMenuOpen(false);
  }, []);

  const itemMenuAtivo = itens.find((i) => i.id === menuId);

  if (itens.length === 0) {
    return (
      <div className="p-8 sm:p-12 text-center" style={{ color: colors.textSecondary }}>
        <p className="text-base sm:text-lg font-medium" style={{ color: colors.text }}>
          Nenhum serviço encontrado.
        </p>
        <p className="text-xs sm:text-sm mt-1">Crie o seu primeiro serviço para começar.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Tabela para ecrãs médios/grandes */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr
              style={{ backgroundColor: colors.border, color: colors.blue, borderColor: colors.border }}
              className="border-b">
              <th className="py-3 px-4 font-semibold">Serviço</th>
              <th className="py-3 px-4 font-semibold">Duração / Unidade</th>
              <th className="py-3 px-4 font-semibold">Preço</th>
              <th className="py-3 px-4 font-semibold">IVA / Retenção</th>
              <th className="py-3 px-4 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: colors.border }}>
            {itens.map((servico) => (
              <tr key={servico.id} style={{ color: colors.text }}>
                <td className="py-3.5 px-4 font-medium">
                  <div>
                    <div className="font-semibold " style={{ color: colors.blue }}>
                      {servico.nome}
                    </div>
                    {servico.descricao && <div className="text-xs truncate max-w-xs"  style={{ color: colors.textSecondary }}>{servico.descricao} </div>}
                  </div>
                </td>
                <td className="py-3.5 px-4"  style={{ color: colors.textSecondary }}>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Clock className="w-3.5 h-3.5 " />
                    <span>
                      {servico.duracao_estimada || "N/A"} {servico.unidade_medida ? `/ ${servico.unidade_medida}` : ""}
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-bold text-slate-900" style={{ color: colors.text }}>
                  {formatarPreco(Number(servico.preco_venda))}
                </td>
                <td className="py-3.5 px-4 text-xs">
                  <div>IVA: {servico.sujeito_iva ? `${servico.taxa_iva}%` : "Isento"}</div>
                  {Number(servico.taxa_retencao) > 0 && (
                    <div className="font-medium"  style={{ color: colors.secondary }}>Retenção: {servico.taxa_retencao}%</div>
                  )}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    ref={(el) => {
                      if (el) buttonRefs.current.set(servico.id, el);
                      else buttonRefs.current.delete(servico.id);
                    }}
                    onClick={(e) => toggleMenu(e, servico.id)}
                    className="p-1. "
                    style={{ color: colors.textSecondary }}>
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Visualização Card para Mobile */}
      <div className="md:hidden divide-y" style={{ borderColor: colors.border }}>
        {itens.map((servico) => (
          <div key={servico.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-sm" style={{ color: colors.blue }}>
                  {servico.nome}
                </h3>
                {servico.descricao && <p className="text-xs mt-0.5"  style={{ color: colors.textSecondary }}>{servico.descricao}</p>}
              </div>
              <button
                ref={(el) => {
                  if (el) buttonRefs.current.set(servico.id, el);
                  else buttonRefs.current.delete(servico.id);
                }}
                onClick={(e) => toggleMenu(e, servico.id)}
                className="p-1 ">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="font-bold" style={{ color: colors.blue }}>
                {formatarPreco(Number(servico.preco_venda))}
              </span>
              <span  style={{ color: colors.textSecondary }}>{servico.duracao_estimada || "Sem duração"}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Menu Popover */}
      {menuOpen &&
        menuPosition &&
        itemMenuAtivo &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] w-44 border shadow-xl py-1.5 text-xs font-medium animate-in fade-in-0 zoom-in-95 duration-100"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              borderColor: colors.border,
              background: colors.background,
            }}>
            <button
              onClick={() => {
                fecharMenu();
                onEditar(itemMenuAtivo);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 transition-all duration-200 hover:pl-6 group"
              style={{ color: colors.blue }}>
              <PencilLine className="w-4 h-4 transition-transform duration-200 group-hover:scale-110"/>
              <span>Editar</span>
            </button>
            <button
              onClick={() => {
                fecharMenu();
                onMoverParaLixeira(itemMenuAtivo);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 transition-all duration-200 hover:pl-6 group"
              style={{ color: colors.secondary }}>
              <Trash2
                className="w-4 h-4 transition-transform duration-200 group-hover:scale-110"
              />
              <span>Mover para Lixeira</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
