export async function exportExcel(data: Record<string, unknown>[]) {
  const XLSX = await import("xlsx");

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Relatorio");

  XLSX.writeFile(wb, "relatorio.xlsx");
}
