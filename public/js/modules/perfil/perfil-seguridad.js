import { showToast } from "../../auth/auth-utils.js";

export class ProfileSecurity {
  setupSecurityListeners() {
    this.setupPasswordForm();
    this.setupDeleteModal();
  }

  setupPasswordForm() {
    const passwordForm = document.getElementById("change-password-form");
    if (passwordForm) {
      passwordForm.addEventListener("submit", (e) => {
        e.preventDefault();
        showToast(
          "La funcionalidad de cambio de contraseña estará disponible pronto",
          "info"
        );
      });
    }
  }

  setupDeleteModal() {
    const deleteModal = document.getElementById("deleteAccountModal");
    if (deleteModal) {
      deleteModal.addEventListener("show.bs.modal", () => {
        this.initializeDeleteModal();
      });
    }
  }

  initializeDeleteModal() {
    const confirmCheckbox = document.getElementById("confirmDelete");
    const deletePassword = document.getElementById("deletePassword");
    const confirmButton = document.getElementById("confirmDeleteAccount");

    confirmCheckbox.checked = false;
    deletePassword.value = "";
    confirmButton.disabled = true;

    const validateDeleteButton = () => {
      confirmButton.disabled = !(
        confirmCheckbox.checked && deletePassword.value.length >= 6
      );
    };

    confirmCheckbox.addEventListener("change", validateDeleteButton);
    deletePassword.addEventListener("input", validateDeleteButton);

    confirmButton.addEventListener("click", () => {
      showToast(
        "La funcionalidad de eliminar cuenta estará disponible pronto",
        "info"
      );
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("deleteAccountModal")
      );
      modal.hide();
    });
  }
}
