"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Search, RefreshCcw, Loader2, User, UserCheck, UserX, MoreVertical, Pencil, Trash2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { fetchUsers, deleteUser, User as UserType } from "@/services/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeColors, initials, RoleBadge } from "./ConfiguracoesComuns";
import { UserModal } from "./UserModal";

export function UsuariosTab({ colors, currentUser }: { colors: ThemeColors; currentUser: UserType | null }) {
  // ✅ Inicializa com array vazio
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<UserType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchUsers();
      // ✅ Garantir que é um array
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const errObj = err as {
        response?: { data?: { message?: string }; status?: number };
        message?: string;
      };
      const status = errObj?.response?.status;
      const msg =
        status === 403
          ? "Sem permissão para listar utilizadores"
          : status === 401
            ? "Sessão expirada — faça login novamente"
            : (errObj?.response?.data?.message ?? errObj?.message ?? "Erro ao carregar utilizadores");
      setLoadError(msg);
      toast.error(msg);
      // ✅ Garantir que users fica como array vazio em caso de erro
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  // ✅ Garantir que users é sempre um array antes de filter
  const filtered = (users || []).filter((u) => {
    const matchSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "todos" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const openCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };
  const openEdit = (u: UserType) => {
    setEditTarget(u);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteUser(deleteConfirm.id);
      toast.success("Utilizador removido!");
      setDeleteConfirm(null);
      void loadUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Erro ao remover utilizador");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle style={{ color: colors.secondary }}>Gestão de Utilizadores</CardTitle>
              <CardDescription style={{ color: colors.textSecondary }}>Crie, edite e gerencie os utilizadores do sistema</CardDescription>
            </div>
            <Button type="button" onClick={openCreate} className="gap-2 text-white" style={{ backgroundColor: colors.primary }}>
              <Plus className="w-4 h-4" /> Novo Utilizador
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textSecondary }} />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                style={{ borderColor: colors.border, color: colors.text }}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-44" style={{ borderColor: colors.border, color: colors.text }}>
                <SelectValue placeholder="Função" />
              </SelectTrigger>
              <SelectContent
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                }}>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="operador">Operador</SelectItem>
                <SelectItem value="gestor">Gestor de Stock</SelectItem>
                <SelectItem value="contablista">Contabilista</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadError && !loading && (
            <div
              className="flex items-center gap-3 p-4 border rounded-lg"
              style={{
                backgroundColor: `${colors.danger}10`,
                borderColor: `${colors.danger}30`,
              }}>
              <AlertCircle className="w-5 h-5 shrink-0" style={{ color: colors.danger }} />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: colors.danger }}>
                  Erro ao carregar utilizadores
                </p>
                <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                  {loadError}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadUsers()}
                style={{ borderColor: colors.danger, color: colors.danger }}>
                <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Tentar novamente
              </Button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
            </div>
          ) : !loadError && filtered.length === 0 ? (
            <div className="text-center py-12" style={{ color: colors.textSecondary }}>
              <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{(users || []).length === 0 ? "Nenhum utilizador registado" : "Nenhum utilizador encontrado"}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filtered.map((u, i) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between p-4 gap-4 rounded-lg"
                    style={{ border: `1px solid ${colors.border}` }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-9 h-9 shrink-0">
                        <AvatarFallback
                          style={{
                            backgroundColor: colors.secondary,
                            color: "white",
                            fontSize: "0.75rem",
                          }}>
                          {initials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm truncate" style={{ color: colors.text }}>
                            {u.name}
                          </p>
                          {u.id === currentUser?.id && (
                            <Badge
                              style={{
                                backgroundColor: `${colors.secondary}20`,
                                color: colors.text,
                                fontSize: "0.65rem",
                              }}>
                              Você
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs truncate" style={{ color: colors.textSecondary }}>
                          {u.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <RoleBadge role={u.role} colors={colors} />
                      <div className="hidden sm:flex items-center gap-1.5">
                        {u.ativo ? (
                          <>
                            <UserCheck className="w-4 h-4" style={{ color: colors.success }} />
                            <span className="text-xs" style={{ color: colors.success }}>
                              Ativo
                            </span>
                          </>
                        ) : (
                          <>
                            <UserX className="w-4 h-4" style={{ color: colors.danger }} />
                            <span className="text-xs" style={{ color: colors.danger }}>
                              Inativo
                            </span>
                          </>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" style={{ color: colors.textSecondary }}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          style={{
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                          }}>
                          <DropdownMenuItem onClick={() => openEdit(u)} style={{ color: colors.text }}>
                            <Pencil className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          {u.id !== currentUser?.id && (
                            <DropdownMenuItem onClick={() => setDeleteConfirm(u)} style={{ color: colors.danger }}>
                              <Trash2 className="w-4 h-4 mr-2" /> Remover
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {!loading && !loadError && (
            <p className="text-xs text-right" style={{ color: colors.textSecondary }}>
              {filtered.length} de {(users || []).length} utilizador(es)
            </p>
          )}
        </CardContent>
      </Card>

      <UserModal open={modalOpen} onClose={closeModal} onSaved={() => void loadUsers()} editUser={editTarget} colors={colors} />

      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(v) => {
          if (!v) setDeleteConfirm(null);
        }}>
        <DialogContent style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <DialogHeader>
            <DialogTitle style={{ color: colors.danger }}>Remover utilizador</DialogTitle>
            <DialogDescription style={{ color: colors.textSecondary }}>
              Tem certeza que deseja remover <strong style={{ color: colors.text }}>{deleteConfirm?.name}</strong>? Esta ação não pode ser
              desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={deleting}
              style={{ borderColor: colors.border, color: colors.text }}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              style={{ backgroundColor: colors.danger, color: "white" }}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              {deleting ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
