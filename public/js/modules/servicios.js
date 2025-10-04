import { supabase } from "../core/supabase.js";

export class ServiciosManager {
  constructor() {
    this.services = [];
    this.categories = [];
    this.isLoaded = false;
  }

  // Obtener todos los servicios activos (carga inicial)
  async getServicios() {
    // Si ya están cargados, devolver los datos en cache
    if (this.isLoaded && this.services.length > 0) {
      return this.services;
    }

    try {
      const { data, error } = await supabase
        .from("services")
        .select(
          "id, active, category, description, duration, image_url, price, title"
        )
        .eq("active", true)
        .order("category")
        .order("title");

      if (error) {
        throw error;
      }

      this.services = data || [];
      this.isLoaded = true;

      // Pre-calcular categorías
      this.categories = [...new Set(data.map((item) => item.category))].sort();

      return this.services;
    } catch (error) {
      console.error("Error obteniendo servicios:", error);
      return [];
    }
  }

  // Obtener servicios por categoría (usando cache)
  getServiciosByCategory(category) {
    if (!this.isLoaded) {
      console.warn(
        "Servicios no cargados aún. Llama a getServicios() primero."
      );
      return [];
    }

    return this.services.filter((service) => service.category === category);
  }

  // Obtener categorías únicas (usando cache)
  getCategorias() {
    if (this.categories.length === 0 && this.isLoaded) {
      this.categories = [
        ...new Set(this.services.map((item) => item.category)),
      ].sort();
    }
    return this.categories;
  }

  // Obtener un servicio específico por ID (usando cache)
  getServicioById(id) {
    if (!this.isLoaded) {
      console.warn(
        "Servicios no cargados aún. Llama a getServicios() primero."
      );
      return null;
    }

    return (
      this.services.find((service) => service.id === id && service.active) ||
      null
    );
  }

  // Forzar recarga de datos (útil cuando sabes que hay cambios)
  async refreshServicios() {
    this.isLoaded = false;
    this.services = [];
    this.categories = [];
    return await this.getServicios();
  }

  // Formatear precio para mostrar
  formatPrice(price) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price);
  }

  // Formatear duración para mostrar
  formatDuration(minutes) {
    if (minutes < 60) {
      return ` ${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0
        ? ` ${hours}h ${remainingMinutes}min`
        : ` ${hours}h`;
    }
  }

  // Renderizar servicios en el contenedor
  async renderServicios(
    containerId = "services-container",
    categoryFilter = null
  ) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error("Contenedor de servicios no encontrado");
      return;
    }

    // Mostrar spinner mientras carga
    container.innerHTML = `
      <div class="col-12 text-center">
          <div class="custom-loader"></div>
          <p class="loader-text">Cargando servicios...</p>
      </div>
    `;

    // Obtener servicios (usa cache si está disponible)
    const servicios = categoryFilter
      ? this.getServiciosByCategory(categoryFilter)
      : await this.getServicios();

    if (servicios.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center">
          <p class="text-muted">No hay servicios disponibles en este momento.</p>
        </div>
      `;
      return;
    }

    // Limpiar contenedor
    container.innerHTML = "";

    // Renderizar cada servicio
    servicios.forEach((servicio) => {
      const serviceCard = this.createServiceCard(servicio);
      container.appendChild(serviceCard);
    });

    // Inicializar event listeners para los botones de reserva
    this.initReservaButtons();
  }

  // Crear card de servicio
  createServiceCard(servicio) {
    const template = document.getElementById("service-card-template");
    if (!template) {
      console.error("Template de servicio no encontrado");
      return document.createElement("div");
    }

    const clone = template.content.cloneNode(true);
    const card = clone.querySelector(".service-card");

    // Configurar datos de la categoría para filtros
    card.setAttribute("data-category", servicio.category);

    // Llenar datos del servicio
    const image = clone.getElementById("service-image");
    const title = clone.getElementById("service-title");
    const description = clone.getElementById("service-description");
    const duration = clone.getElementById("service-duration");
    const price = clone.getElementById("service-price");
    const reservarBtn = clone.querySelector(".btn-reservar");

    // Asignar valores
    if (image) {
      // Usar imagen por defecto si no hay URL o es inválida
      const imageUrl = servicio.image_url?.trim();
      image.src =
        imageUrl && imageUrl !== ""
          ? imageUrl
          : "assets/img/service-default.webp";
      image.alt = servicio.title;

      // Agregar manejo de error de imagen
      image.onerror = () => {
        image.src = "assets/img/service-default.webp";
      };
    }

    if (title) title.textContent = servicio.title;
    if (description) description.textContent = servicio.description;
    if (duration) duration.textContent = this.formatDuration(servicio.duration);
    if (price) price.textContent = this.formatPrice(servicio.price);

    // Configurar botón de reserva
    if (reservarBtn) {
      reservarBtn.setAttribute("data-servicio-id", servicio.id);
    }

    return clone;
  }

  // Inicializar botones de reserva
  initReservaButtons() {
    const reservarButtons = document.querySelectorAll(".btn-reservar");

    reservarButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        this.handleReservaClick(e);
      });
    });
  }

  // Manejar clic en botón de reserva
  handleReservaClick(event) {
    const button = event.target.closest(".btn-reservar");
    if (!button) return;

    const servicioId = button.getAttribute("data-servicio-id");

    if (servicioId) {
      const servicio = this.getServicioById(servicioId);

      if (!servicio) {
        console.error("Servicio no encontrado:", servicioId);
        return;
      }

      // Verificar autenticación
      if (!window.currentUser) {
        // Mostrar modal de login si no está autenticado
        const loginModal = new bootstrap.Modal(
          document.getElementById("loginModal")
        );
        loginModal.show();
        return;
      }

      // Aquí puedes continuar con el flujo de reserva usando el servicio
      console.log("Iniciando reserva para:", servicio);
    }
  }
}

// Exportar instancia única
export const serviciosManager = new ServiciosManager();
