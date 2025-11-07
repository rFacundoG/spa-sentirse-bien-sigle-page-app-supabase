export class AdminUI {
  constructor(adminManager) {
    this.adminManager = adminManager;
  }

  updateAdminDropdown() {
    const adminLinkItem = document.getElementById("admin-link-item");
    if (adminLinkItem) {
      adminLinkItem.style.display = this.adminManager.isAdmin
        ? "block"
        : "none";
    }
  }

  setupAdminRoute() {
    if (typeof window.App !== "undefined" && window.App.router) {
      window.App.router.routes.admin = "./pages/admin.html";
    }
  }

  setupAdminListeners() {
    // Listener para abrir el modal de crear usuario
    const createUserBtn = document.getElementById("btn-abrir-crear-usuario");
    if (createUserBtn) {
      createUserBtn.addEventListener("click", () => {
        const modal = new bootstrap.Modal(
          document.getElementById("createUserModal")
        );
        modal.show();
      });
    }

    // Listener para el formulario de crear usuario
    const createUserForm = document.getElementById("create-user-form");
    if (createUserForm) {
      createUserForm.addEventListener("submit", (e) =>
        this.adminManager.users.handleCreateUser(e)
      );
    }
    
    // Delegación de eventos para filtros de usuarios
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("filter-users-btn")) {
        e.preventDefault();
        const filter = e.target.getAttribute("data-filter");
        this.adminManager.users.filterUsers(filter);

        const dropdownToggle = document.querySelector(
          ".dropdown-filter .dropdown-toggle"
        );
        if (dropdownToggle) {
          let filterText = "Filtrar";
          if (filter === "all") filterText = "Todos";
          if (filter === "admin") filterText = "Administradores";
          if (filter === "user") filterText = "Usuarios";
          dropdownToggle.textContent = filterText;
        }
      }
    });

    // Listener para el formulario de servicio
    const form = document.getElementById("servicio-form");
    if (form) {
      form.addEventListener("submit", (e) =>
        this.adminManager.services.handleSaveService(e)
      );
    }

    // Listener para el botón "Crear Servicio"
    const createBtn = document.getElementById("btn-crear-servicio");
    if (createBtn) {
      createBtn.addEventListener("click", () =>
        this.adminManager.services.handleCreateService()
      );
    }
  }
}
