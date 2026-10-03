// ============================================================
// Template: fila de estadísticas
// ============================================================

/**
 * @param {{ total:number, activos:number, enProceso:number, ofertas:number, cerradas:number }} stats
 * @returns {string} HTML
 */
export function renderStats(stats) {
  return `
    <div class="stat" data-color="info">
      <div class="num">${stats.total}</div>
      <div class="label">Total</div>
    </div>
    <div class="stat" data-color="info">
      <div class="num">${stats.activos}</div>
      <div class="label">Activas</div>
    </div>
    <div class="stat" data-color="warning">
      <div class="num">${stats.enProceso}</div>
      <div class="label">En proceso</div>
    </div>
    <div class="stat" data-color="success">
      <div class="num">${stats.ofertas}</div>
      <div class="label">Ofertas</div>
    </div>
    <div class="stat" data-color="danger">
      <div class="num">${stats.cerradas}</div>
      <div class="label">Cerradas</div>
    </div>
  `;
}