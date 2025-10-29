// modules/admin.js
import { supabase } from "../core/supabase.js";

export class AdminManager {
  constructor() {
    this.isAdmin = false;
    this.init();
  }

  async init() {
    await this.checkAdminAccess();
    this.setupAdminRoute();
  }

  async checkAdminAccess() {
    try {
      const user = window.currentUser;
      this.isAdmin = user && user.rol === "admin";

      // Actualizar UI del dropdown
      this.updateAdminDropdown();

      return this.isAdmin;
    } catch (error) {
      console.error("Error checking admin access:", error);
      return false;
    }
  }

  updateAdminDropdown() {
    const adminLinkItem = document.getElementById("admin-link-item");
    if (adminLinkItem) {
      adminLinkItem.style.display = this.isAdmin ? "block" : "none";
    }
  }

  setupAdminRoute() {
    // Agregar la ruta de admin al router
    if (typeof window.App !== "undefined" && window.App.router) {
      window.App.router.routes.admin = "./pages/admin.html";
    }
  }

  // Verificar permisos antes de cargar admin
  async verifyAdminPermissions() {
    if (!this.isAdmin) {
      console.warn(
        "Intento de acceso no autorizado al panel de administración"
      );

      // Mostrar mensaje de error
      if (typeof showToast === "function") {
        showToast(
          "No tienes permisos para acceder al panel de administración",
          "error"
        );
      }

      // Redirigir al home
      setTimeout(() => {
        window.history.replaceState({ page: "home" }, "", "#home");
        if (typeof window.App !== "undefined" && window.App.router) {
          window.App.router.navigateTo("home", false);
        }
      }, 100);

      return false;
    }
    return true;
  }

  // Cargar datos del panel de administración
  async loadAdminData() {
    if (!(await this.verifyAdminPermissions())) return;

    try {
      // Cargar estadísticas
      await this.loadAdminStats();

      // Cargar profesionales
      await this.loadProfessionals();

      // Cargar usuarios
      await this.loadUsers();
    } catch (error) {
      console.error("Error loading admin data:", error);
    }
  }

  async loadAdminStats() {
    try {
      // Ejemplo: contar usuarios y profesionales
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id", { count: "exact" });

      const { data: professionals, error: prosError } = await supabase
        .from("professionals")
        .select("id", { count: "exact" });

      if (!usersError && !prosError) {
        const statsElement = document.getElementById("admin-stats");
        if (statsElement) {
          statsElement.textContent = `${users.length} usuarios, ${professionals.length} profesionales`;
        }
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
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

  async loadUsers() {
    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      this.renderUsersTable(users || []);
    } catch (error) {
      console.error("Error loading users:", error);
      this.renderUsersTable([]);
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
                    <span class="badge bg-${
                      pro.is_active ? "success" : "danger"
                    }">
                        ${pro.is_active ? "Activo" : "Inactivo"}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="adminManager.editProfessional(${
                      pro.id
                    })">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="adminManager.deleteProfessional(${
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

  renderUsersTable(users) {
    const tbody = document.getElementById("users-table-body");
    if (!tbody) return;

    if (users.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4 text-muted">
                        No hay usuarios registrados
                    </td>
                </tr>
            `;
      return;
    }

    tbody.innerHTML = users
      .map(
        (user) => `
            <tr>
                <td>${user.nombre || user.display_name || "Usuario"}</td>
                <td>${user.email}</td>
                <td>
                    <span class="badge bg-${
                      user.rol === "admin" ? "warning" : "info"
                    }">
                        ${user.rol === "admin" ? "Administrador" : "Usuario"}
                    </span>
                </td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="adminManager.editUser('${
                      user.id
                    }')">
                        <i class="bi bi-pencil"></i>
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

  editUser(id) {
    console.log("Editar usuario:", id);
    // Implementar lógica de edición
  }
}

// Inicializar el admin manager
let adminManager;

export function initAdmin() {
  adminManager = new AdminManager();
  return adminManager;
}

// Hacer disponible globalmente para los onclick
window.adminManager = adminManager;
