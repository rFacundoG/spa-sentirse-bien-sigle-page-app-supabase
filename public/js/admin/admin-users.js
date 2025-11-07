import { supabase } from "../core/supabase.js";

export class AdminUsers {
  constructor(adminManager) {
    this.adminManager = adminManager;
  }

  async loadUsers() {
    try {
      console.log("🔄 Cargando usuarios...");
      console.log("Usuario actual:", window.currentUser);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      console.log("Sesión completa:", session);

      if (session?.access_token) {
        const payload = JSON.parse(atob(session.access_token.split(".")[1]));
        console.log("🔐 JWT Payload:", payload);
        console.log("📋 Claims en el JWT:", Object.keys(payload));
        console.log("🎯 Role en JWT:", payload.role);
        console.log("👤 User metadata:", payload.user_metadata);
      }

      const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("📊 Resultado consulta:", users);

      if (error) throw error;
      this.renderUsersTable(users || []);
    } catch (error) {
      console.error("💥 Error loading users:", error);
      this.renderUsersTable([]);
    }
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
              <button class="btn btn-sm btn-outline-primary" onclick="adminManager.users.editUser('${
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

  filterUsers(filterType) {
    console.log(`🎯 Aplicando filtro: ${filterType}`);

    const tbody = document.getElementById("users-table-body");
    if (!tbody) return;

    const allRows = tbody.querySelectorAll("tr");

    allRows.forEach((row) => {
      if (row.querySelector("td[colspan]")) return;

      const roleBadge = row.querySelector(".badge");
      const role = roleBadge ? roleBadge.textContent.trim() : "";

      let shouldShow = true;

      switch (filterType) {
        case "admin":
          shouldShow = role === "Administrador";
          break;
        case "user":
          shouldShow = role === "Usuario";
          break;
        case "all":
        default:
          shouldShow = true;
      }

      row.style.display = shouldShow ? "" : "none";
    });

    const visibleRows = Array.from(allRows).filter(
      (row) => row.style.display !== "none" && !row.querySelector("td[colspan]")
    );

    if (visibleRows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4 text-muted">
            No hay usuarios que coincidan con el filtro
          </td>
        </tr>
      `;
    }
  }

  async handleCreateUser(event) {
    event.preventDefault();

    const form = event.target;
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const formData = new FormData(form);
    const userData = {
      nombre: formData.get("nombre"),
      apellido: formData.get("apellido") || "",
      email: formData.get("email"),
      telefono: formData.get("telefono") || "",
      password: formData.get("password"),
      rol: formData.get("rol"),
    };

    // Obtener el botón y elementos del loader
    const submitBtn = document.getElementById("btn-crear-usuario");
    const btnText = submitBtn.querySelector(".btn-text");
    const btnLoader = submitBtn.querySelector(".btn-loader");

    try {
      // Bloquear botón y mostrar loader
      submitBtn.disabled = true;
      btnText.textContent = "Creando...";
      btnLoader.classList.remove("d-none");

      // Obtener la sesión actual correctamente
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No hay sesión activa");
      }

      // Llamar a Edge Function
      const response = await fetch(
        "https://mvbpdtdvbgdknvirbsvs.supabase.co/functions/v1/admin-create-user",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(userData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al crear usuario");
      }

      // Éxito
      if (typeof showToast === "function") {
        showToast("Usuario creado exitosamente", "success");
      }

      // Cerrar modal y recargar lista
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("createUserModal")
      );
      modal.hide();

      // Recargar la lista de usuarios
      await this.loadUsers();

      // Resetear formulario
      form.reset();
      form.classList.remove("was-validated");
    } catch (error) {
      console.error("Error creando usuario:", error);
      if (typeof showToast === "function") {
        showToast(`Error: ${error.message}`, "error");
      } else {
        alert(`Error: ${error.message}`);
      }
    } finally {
      // Siempre restaurar el botón sin importar el resultado
      if (submitBtn) {
        submitBtn.disabled = false;
        btnText.textContent = "Crear Usuario";
        btnLoader.classList.add("d-none");
      }
    }
  }

  editUser(id) {
    console.log("Editar usuario:", id);
    // Implementar lógica de edición
  }
}
