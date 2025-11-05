// modules/admin.js
import { supabase } from "../core/supabase.js";
import { serviciosManager } from "./services/index.js";

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
      // Cargar servicios
      await this.loadServices();

      // Configurar listeners del formulario
      this.setupAdminListeners();
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

  setupAdminListeners() {
    // Listener para el formulario de servicio
    const form = document.getElementById("servicio-form");
    if (form) {
      form.addEventListener("submit", (e) => this.handleSaveService(e));
    }

    // Listener para el botón "Crear Servicio"
    const createBtn = document.getElementById("btn-crear-servicio");
    if (createBtn) {
      createBtn.addEventListener("click", () => this.handleCreateService());
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

  // --- INICIO: CRUD DE SERVICIOS ---

  /**
   * Carga TODOS los servicios desde el manager y llama a renderizar la tabla.
   */
  async loadServices() {
    try {
      // Para el admin, es mejor tener TODOS los servicios, no solo los activos
      // Usamos el caché del manager
      const services = await serviciosManager.getAllServices();
      this.renderServicesTable(services || []);
    } catch (error) {
      console.error("Error loading services:", error);
      this.renderServicesTable([]); // Renderiza tabla vacía en caso de error
    }
  }

  /**
   * Renderiza la tabla de servicios en el panel de admin.
   */
  renderServicesTable(services) {
    const tbody = document.getElementById("services-table-body");
    if (!tbody) return; // Salir si la pestaña no está cargada

    tbody.innerHTML = ""; // Limpiar el spinner

    if (services.length === 0) {
      tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4 text-muted">
                    No hay servicios registrados
                </td>
            </tr>`;
      return;
    }

    // Usamos el formatPrice del manager
    const formatPrice = serviciosManager.formatPrice.bind(serviciosManager);

    services.forEach((service) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td>${service.title}</td>
            <td>${service.category}</td>
            <td>${service.duration || "N/A"} min</td>
            <td>${formatPrice(service.price)}</td>
            <td>
                <span class="badge bg-${service.active ? "success" : "danger"}">
                    ${service.active ? "Activo" : "Inactivo"}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" data-edit-id="${
                  service.id
                }">
                    <i class="bi bi-pencil" data-edit-id="${service.id}"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" data-delete-id="${
                  service.id
                }">
                    <i class="bi bi-trash" data-delete-id="${service.id}"></i>
                </button>
            </td>
        `;

      // Añadir listeners de forma segura (sin onclick)
      tr.querySelector(`[data-edit-id]`).addEventListener("click", () =>
        this.handleEditService(service.id)
      );
      tr.querySelector(`[data-delete-id]`).addEventListener("click", () =>
        this.handleDeleteService(service.id, service.title)
      );

      tbody.appendChild(tr);
    });
  }

  /**
   * Abre el modal para crear un nuevo servicio (formulario vacío).
   */
  handleCreateService() {
    const form = document.getElementById("servicio-form");
    form.reset(); // Limpia campos
    form.classList.remove("was-validated"); // Limpia validación

    document.getElementById("servicio-id").value = ""; // Asegura que no haya ID
    document.getElementById("servicio-active").checked = true; // Default a activo
    document.getElementById("servicioModalTitle").textContent =
      "Crear Servicio";

    const modal = new bootstrap.Modal(document.getElementById("servicioModal"));
    modal.show();
  }

  /**
   * Carga los datos de un servicio en el modal para editarlo.
   */
  handleEditService(id) {
    const service = serviciosManager.getServicioById(id);
    if (!service) {
      // ¡MENSAJE DE ERROR ESTÁTICO! (error no existe aquí)
      const errorMsg = "Error: Servicio no encontrado.";
      if (typeof showToast === "function") {
        showToast(errorMsg, "danger");
      } else {
        alert(errorMsg);
      }
      return;
    }

    const form = document.getElementById("servicio-form");
    form.classList.remove("was-validated");

    // Llenar el formulario
    document.getElementById("servicio-id").value = service.id;
    document.getElementById("servicio-title").value = service.title;
    document.getElementById("servicio-description").value = service.description;
    document.getElementById("servicio-category").value = service.category;
    document.getElementById("servicio-price").value = service.price;
    document.getElementById("servicio-duration").value = service.duration;
    document.getElementById("servicio-image_url").value =
      service.image_url || "";
    document.getElementById("servicio-active").checked = service.active;

    document.getElementById("servicioModalTitle").textContent =
      "Editar Servicio";

    const modal = new bootstrap.Modal(document.getElementById("servicioModal"));
    modal.show();
  }

  /**
   * Maneja el envío del formulario (Crear o Actualizar).
   */
  async handleSaveService(event) {
    event.preventDefault();
    const form = event.target;
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const serviceId = document.getElementById("servicio-id").value;
    const servicioData = {
      title: document.getElementById("servicio-title").value,
      description: document.getElementById("servicio-description").value,
      category: document.getElementById("servicio-category").value,
      price: parseFloat(document.getElementById("servicio-price").value),
      duration: parseInt(document.getElementById("servicio-duration").value),
      image_url: document.getElementById("servicio-image_url").value || null,
      active: document.getElementById("servicio-active").checked,
    };

    try {
      let successMsg = ""; // Variable para el mensaje de éxito

      if (serviceId) {
        // --- ACTUALIZAR ---
        await serviciosManager.updateServicio(Number(serviceId), servicioData);
        successMsg = "Servicio actualizado con éxito"; // Mensaje correcto
      } else {
        // --- CREAR ---
        await serviciosManager.createServicio(servicioData);
        successMsg = "Servicio creado con éxito"; // Mensaje correcto
      }

      // Mostrar mensaje de éxito
      if (typeof showToast === "function") {
        showToast(successMsg, "success");
      } else {
        alert(successMsg);
      }

      // Refrescar y cerrar (ESTO AHORA SÍ SE EJECUTARÁ)
      this.loadServices();
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("servicioModal")
      );
      modal.hide();
    } catch (error) {
      // El catch solo para ERRORES REALES
      console.error("Error guardando servicio:", error);
      if (typeof showToast === "function") {
        showToast(`Error: ${error.message}`, "danger");
      } else {
        alert(`Error: ${error.message}`);
      }
    }
  }

  /**
   * Pide confirmación y elimina un servicio.
   */
  async handleDeleteService(id, title) {
    if (
      !confirm(`¿Estás seguro de que quieres eliminar el servicio "${title}"?`)
    ) {
      return;
    }

    try {
      await serviciosManager.deleteServicio(id);

      // Mensaje de éxito
      const successMsg = "Servicio eliminado con éxito";
      if (typeof showToast === "function") {
        showToast(successMsg, "success");
      } else {
        alert(successMsg);
      }

      this.loadServices(); // Recargar la tabla
    } catch (error) {
      console.error("Error eliminando servicio:", error);
      if (typeof showToast === "function") {
        showToast(`Error: ${error.message}`, "danger");
      } else {
        alert(`Error: ${error.message}`);
      }
    }
  }

  // --- FIN: CRUD DE SERVICIOS ---

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
  window.adminManager = adminManager;
  return adminManager;
}

// Hacer disponible globalmente para los onclick
window.adminManager = adminManager;
