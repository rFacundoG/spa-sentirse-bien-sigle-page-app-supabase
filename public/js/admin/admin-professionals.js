import { supabase } from "../core/supabase.js";

export class AdminProfessionals {
  constructor(adminManager) {
    this.adminManager = adminManager;
  }

  async loadProfessionals() {
    try {
      const { data: professionals, error } = await supabase
        .from("professionals")
        .select("*")
        .order("nombre");

      if (error) throw error;
      this.renderProfessionalsTable(professionals || []);
    } catch (error) {
      console.error("Error loading professionals:", error);
      this.renderProfessionalsTable([]);
    }
  }

  renderProfessionalsTable(professionals) {
    const tbody = document.getElementById("professionals-table-body");
    if (!tbody) return;

    if (professionals.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-muted">
            No hay profesionales registrados
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = professionals
      .map(
        (pro) => `
          <tr>
            <td>${pro.nombre} ${pro.apellido}</td>
            <td>${pro.especialidad}</td>
            <td>${pro.email}</td>
            <td>${pro.telefono || "N/A"}</td>
            <td>
              <span class="badge bg-${pro.is_active ? "success" : "danger"}">
                ${pro.is_active ? "Activo" : "Inactivo"}
              </span>
            </td>
            <td>
              <button class="btn btn-sm btn-outline-primary me-1" onclick="adminManager.professionals.editProfessional(${
                pro.id
              })">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="adminManager.professionals.deleteProfessional(${
                pro.id
              })">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>
        `
      )
      .join("");
  }

  // Métodos para editar/eliminar (puedes expandirlos)
  editProfessional(id) {
    console.log("Editar profesional:", id);
    // Implementar lógica de edición
  }

  deleteProfessional(id) {
    console.log("Eliminar profesional:", id);
    // Implementar lógica de eliminación
  }
}
