import { supabase } from "../core/supabase.js";

export class AdminProfessionals {
  constructor(adminManager) {
    this.adminManager = adminManager;
  }

  async loadProfessionals() {
    try {
      const { data: professionals, error } = await supabase
        .from("professionals")
        .select(
          `
        *,
        users!inner(*)
      `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      this.renderProfessionalsTable(professionals || []);
    } catch (error) {
      console.error("Error loading professionals:", error);
      this.renderProfessionalsTable([]);
    }
  }

  renderProfessionalsTable(professionals) {
    console.log(
      "[DEBUG] renderProfessionalsTable llamado con:",
      professionals
    );

    const tbody = document.getElementById("professionals-table-body");
    console.log("🔍 [DEBUG] tbody encontrado:", tbody);

    if (!tbody) {
      console.error(
        "[DEBUG] No se encontró el tbody con id 'professionals-table-body'"
      );
      return;
    }

    if (professionals.length === 0) {
      console.log("[DEBUG] No hay profesionales, mostrando mensaje vacío");
      tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4 text-muted">
                No hay profesionales registrados
                </td>
            </tr>
            `;
      return;
    }

    console.log(
      "[DEBUG] Renderizando",
      professionals.length,
      "profesionales"
    );

    tbody.innerHTML = professionals
      .map((pro, index) => {
        console.log(`👤 [DEBUG] Procesando profesional ${index + 1}:`, pro);

        const user = pro.users || {};
        console.log(
          `[DEBUG] Datos de usuario para profesional ${index + 1}:`,
          user
        );

        let nombreCompleto = "N/A";
        if (user.nombre && user.apellido) {
          nombreCompleto = `${user.nombre} ${user.apellido}`.trim();
        } else if (user.nombre) {
          nombreCompleto = user.nombre;
        } else if (pro.name) {
          nombreCompleto = pro.name;
        } else {
          nombreCompleto = user.email || pro.email || "Profesional";
        }

        const email = user.email || pro.email || "N/A";
        const telefono = user.telefono || pro.phone || "N/A";
        const estadoUsuario = user.is_active ? "Activo" : "Inactivo";
        const tieneCuenta = !!user.id;

        console.log(`[DEBUG] Datos procesados para ${index + 1}:`, {
          nombreCompleto,
          email,
          telefono,
          tieneCuenta,
          estadoUsuario,
        });

        return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="professional-avatar bg-primary rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                                <span class="text-white fw-bold">${nombreCompleto.charAt(
                                  0
                                )}</span>
                            </div>
                            <div>
                                <div class="fw-semibold">${nombreCompleto}</div>
                                <small class="text-muted">${email}</small>
                                ${
                                  !tieneCuenta
                                    ? '<small class="text-warning d-block"><i class="bi bi-exclamation-triangle"></i> Sin cuenta de acceso</small>'
                                    : ""
                                }
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge bg-primary">${
                          pro.specialty || "N/A"
                        }</span>
                    </td>
                    <td>${telefono}</td>
                    <td>${pro.experience_years || 0} años</td>
                    <td>
                        <span class="badge bg-${
                          pro.is_active ? "success" : "danger"
                        }">
                            ${pro.is_active ? "Activo" : "Inactivo"}
                        </span>
                    </td>
                    <td>
                        <span class="badge bg-${
                          tieneCuenta
                            ? user.is_active
                              ? "success"
                              : "secondary"
                            : "warning"
                        }">
                            ${tieneCuenta ? estadoUsuario : "Sin cuenta"}
                        </span>
                    </td>
                    <td>${new Date(pro.created_at).toLocaleDateString()}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary me-1" onclick="adminManager.professionals.editProfessional('${
                              pro.id
                            }')" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-info me-1" onclick="adminManager.professionals.viewProfessional('${
                              pro.id
                            }')" title="Ver detalles">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="adminManager.professionals.deleteProfessional('${
                              pro.id
                            }', '${nombreCompleto.replace(
          /'/g,
          "\\'"
        )}')" title="Eliminar">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
                `;
      })
      .join("");

    console.log("[DEBUG] Tabla renderizada correctamente");
  }

  viewProfessional(id) {
    console.log("Ver detalles del profesional:", id);
    // Aquí puedes implementar un modal de detalles
  }

  async handleCreateProfessional(event) {
    event.preventDefault();

    const form = document.getElementById("add-professional-form");
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      const firstInvalid = form.querySelector(":invalid");
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const formData = new FormData(form);
    const professionalData = {
      nombre: formData.get("nombre"),
      apellido: formData.get("apellido"),
      email: formData.get("email"),
      telefono: formData.get("telefono"),
      specialty: formData.get("especialidad"),
      experience_years: parseInt(formData.get("experiencia")) || 0,
      bio: formData.get("bio"),
    };

    const password = formData.get("password");
    const confirmPassword = formData.get("confirm_password");

    // Validar contraseñas - USAR alert en lugar de showToast
    if (password !== confirmPassword) {
      document
        .getElementById("pro-confirm-password")
        .classList.add("is-invalid");
      alert("Las contraseñas no coinciden");
      return;
    }

    if (!password || password.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    const submitBtn = document.getElementById("save-professional");
    const btnText = submitBtn.querySelector(".btn-text");
    const btnLoader = submitBtn.querySelector(".btn-loader");

    try {
      submitBtn.disabled = true;
      btnText.textContent = "Guardando...";
      btnLoader.classList.remove("d-none");

      // USAR console.log en lugar de showToast para el mensaje de carga
      console.log("Creando profesional...");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error("No hay sesión activa");

      // Llamar Edge Function
      const response = await fetch(
        "https://mvbpdtdvbgdknvirbsvs.supabase.co/functions/v1/admin-create-professional",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            professionalData,
            password,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Error al crear profesional");

      // USAR alert para éxito
      alert("Profesional creado exitosamente con cuenta de acceso");

      // Cerrar modal y recargar
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("addProfessionalModal")
      );
      modal.hide();
      await this.loadProfessionals();
      form.reset();
      form.classList.remove("was-validated");
    } catch (error) {
      console.error("Error creando profesional:", error);
      let errorMessage = "Error creando profesional";

      if (error.message.includes("already registered")) {
        errorMessage = "Este email ya está registrado";
      } else {
        errorMessage = `Error: ${error.message}`;
      }

      // USAR alert para errores
      alert(errorMessage);
    } finally {
      submitBtn.disabled = false;
      btnText.textContent = "Guardar Profesional";
      btnLoader.classList.add("d-none");
    }
  }

  // En setupEventListeners, REMOVER el toggle del checkbox
  setupEventListeners() {
    // Solo mantener validación de contraseñas
    const confirmPasswordField = document.getElementById(
      "pro-confirm-password"
    );
    const passwordField = document.getElementById("pro-password");

    if (confirmPasswordField && passwordField) {
      confirmPasswordField.addEventListener("input", function () {
        const password = passwordField.value;
        if (this.value !== password) {
          this.classList.add("is-invalid");
        } else {
          this.classList.remove("is-invalid");
        }
      });

      passwordField.addEventListener("input", function () {
        const confirmPassword = confirmPasswordField.value;
        if (confirmPassword && confirmPassword !== this.value) {
          confirmPasswordField.classList.add("is-invalid");
        } else {
          confirmPasswordField.classList.remove("is-invalid");
        }
      });
    }

    // Form submit
    const form = document.getElementById("add-professional-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleCreateProfessional(e);
      });
    }
  }

  async editProfessional(id) {
    try {
      const { data: professional, error } = await supabase
        .from("professionals")
        .select(
          `
                    *,
                    users (id, nombre, apellido, email, telefono, rol, is_active)
                `
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      console.log("Editar profesional:", professional);
      // Implementar modal de edición para profesionales
    } catch (error) {
      console.error("Error cargando profesional:", error);
      if (typeof showToast === "function") {
        showToast(`Error al cargar profesional: ${error.message}`, "error");
      }
    }
  }

  async deleteProfessional(id, name) {
    if (
      !confirm(
        `¿Estás seguro de eliminar al profesional "${name}"?\n\nEsta acción eliminará al profesional pero NO la cuenta de usuario asociada.`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("professionals")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (typeof showToast === "function") {
        showToast("✅ Profesional eliminado exitosamente", "success");
      }

      await this.loadProfessionals();
    } catch (error) {
      console.error("Error eliminando profesional:", error);
      if (typeof showToast === "function") {
        showToast(`❌ Error: ${error.message}`, "error");
      }
    }
  }

  setupEventListeners() {
    // Toggle campos de cuenta
    const createAccountCheckbox = document.getElementById("pro-create-account");
    const accountFields = document.getElementById("account-fields");

    if (createAccountCheckbox && accountFields) {
      createAccountCheckbox.addEventListener("change", function () {
        accountFields.style.display = this.checked ? "block" : "none";

        // Hacer requeridos los campos de contraseña si se crea cuenta
        const passwordFields = accountFields.querySelectorAll(
          'input[type="password"]'
        );
        passwordFields.forEach((field) => {
          field.required = this.checked;
          if (!this.checked) {
            field.value = ""; // Limpiar campos si se desactiva
          }
        });

        // Remover validación si se desactiva
        if (!this.checked) {
          passwordFields.forEach((field) => {
            field.classList.remove("is-invalid");
          });
        }
      });
    }

    // Validación de confirmación de contraseña
    const confirmPasswordField = document.getElementById(
      "pro-confirm-password"
    );
    const passwordField = document.getElementById("pro-password");

    if (confirmPasswordField && passwordField) {
      confirmPasswordField.addEventListener("input", function () {
        const password = passwordField.value;
        if (this.value !== password) {
          this.classList.add("is-invalid");
        } else {
          this.classList.remove("is-invalid");
        }
      });

      passwordField.addEventListener("input", function () {
        const confirmPassword = confirmPasswordField.value;
        if (confirmPassword && confirmPassword !== this.value) {
          confirmPasswordField.classList.add("is-invalid");
        } else {
          confirmPasswordField.classList.remove("is-invalid");
        }
      });
    }

    // Form submit
    const form = document.getElementById("add-professional-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleCreateProfessional(e);
      });
    }

    // Botón de guardar profesional
    const saveBtn = document.getElementById("save-professional");
    if (saveBtn) {
      saveBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const form = document.getElementById("add-professional-form");
        if (form) {
          // Simular submit del formulario
          const submitEvent = new Event("submit", {
            bubbles: true,
            cancelable: true,
          });
          form.dispatchEvent(submitEvent);
        }
      });
    }
  }
}
