// public/js/modules/reservas.js

// Importamos el router (para redirigir si hay error)
// Asumo que tu router está en window.App.router como en tus otros archivos
// Si no, import 'router.js'
// import { router } from '../core/router.js'; // Ajusta la ruta si es necesario

// --- VARIABLES GLOBALES DEL MÓDULO ---
let servicioSeleccionado = null;
let fechaSeleccionada = null;
let horaSeleccionada = null;

/**
 * Función principal para inicializar la página de reservas.
 * Se llama desde el router.
 */
export function initReservasPage() {
    // 1. Obtener datos del localStorage
    const servicioJSON = localStorage.getItem("servicioParaReservar");

    if (!servicioJSON) {
        console.error("No se encontró servicio para reservar. Redirigiendo...");
        // Asumiendo que el router está disponible globalmente
        // (Si no, necesitarás importarlo y usarlo)
        window.App.router.navigateTo("servicios");
        return;
    }

    servicioSeleccionado = JSON.parse(servicioJSON);

    // 2. Poblar los detalles del servicio y calcular precio
    populateServiceDetails(servicioSeleccionado);

    // 3. Inicializar el calendario
    initCalendar();

    // 4. Configurar listeners
    setupListeners();
}

/**
 * Rellena la información del servicio en la UI.
 */
function populateServiceDetails(servicio) {
    document.getElementById("reserva-service-title").textContent = servicio.title;
    
    // Formatear duración (si existe)
    const duracionEl = document.getElementById("reserva-service-duration");
    if (servicio.duration) {
        duracionEl.textContent = formatDuration(servicio.duration);
    } else {
        duracionEl.style.display = "none";
    }

    // Rellenar resumen
    const resumenContainer = document.getElementById("resumen-servicio-seleccionado");
    resumenContainer.innerHTML = `
        <p class="mb-1">${servicio.title}</p>
        <p class="small text-muted">${servicio.isGrupal ? "Servicio Grupal" : "Servicio Individual"}</p>
    `;
    
    // Calcular precios (Tarea 4)
    calculatePrice(servicio.price);
}

/**
 * Inicializa el calendario Flatpickr.
 * Aquí se aplica la Tarea 3 (Regla de 48hs).
 */
function initCalendar() {
    // Tarea 3: "Solo se puede realizar la reserva hasta 48 hs antes"
    // Esto significa que la fecha mínima es "hoy + 2 días".
    const minDate = new Date().fp_incr(2); // ¡Magia de Flatpickr!

    flatpickr("#datepicker-inline", {
        inline: true, // Muestra el calendario siempre visible
        minDate: minDate,
        dateFormat: "Y-m-d", // Formato estándar
        onChange: function(selectedDates) {
            // Se dispara cuando el usuario elige una fecha
            fechaSeleccionada = selectedDates[0];
            console.log("Fecha seleccionada:", fechaSeleccionada);
            
            // Habilitar botón de confirmar (temporalmente)
            // document.getElementById("btn-confirmar-reserva").disabled = false;

            // Próximo paso: Cargar horarios disponibles para esta fecha
            loadAvailableSlots(fechaSeleccionada, servicioSeleccionado.id);
        }
    });
}

/**
 * Calcula el precio final aplicando el descuento.
 * Aquí se aplica la Tarea 4 (Descuento 15%).
 */
function calculatePrice(basePrice) {
    // Tarea 4: "Si el pago se realiza... antes de las 48 hs... descuento del 15%"
    // Dado que la Tarea 3 (regla de calendario) FUERZA a que todas las
    // reservas sean "antes de 48hs", aplicamos el descuento a todas las
    // reservas online.
    
    const subtotal = parseFloat(basePrice);
    const descuento = subtotal * 0.15;
    const total = subtotal - descuento;

    document.getElementById("resumen-subtotal").textContent = formatPrice(subtotal);
    document.getElementById("resumen-descuento").textContent = `- ${formatPrice(descuento)}`;
    document.getElementById("resumen-total").textContent = formatPrice(total);

    // Actualizar alerta de reglas
    const alertBox = document.getElementById("reserva-reglas-alert");
    alertBox.innerHTML = `
        <i class="bi bi-info-circle-fill me-2"></i>
        Tu reserva incluye un <strong>15% de descuento</strong> por pago online.
    `;
}

/**
 * [PENDIENTE] Carga los horarios disponibles desde Supabase.
 */
async function loadAvailableSlots(date, serviceId) {
    const container = document.getElementById("horarios-disponibles-container");
    container.innerHTML = `<p class="text-muted">Buscando horarios disponibles...</p>`;

    // --- Lógica Futura ---
    // 1. Consultar Supabase: `supabase.from('bookings').select('booking_time').eq('service_id', serviceId).eq('date', date)`
    // 2. Generar lista de horarios (ej. 9:00 a 18:00)
    // 3. Filtrar horarios ya reservados
    // 4. Llamar a renderSlots() con los horarios disponibles
    // --- Fin Lógica Futura ---

    // Por ahora, simulamos horarios:
    const horariosSimulados = ["09:00", "10:30", "12:00", "15:00", "16:30"];
    renderSlots(horariosSimulados);
}

/**
 * Renderiza los botones de horarios disponibles.
 */
function renderSlots(slots) {
    const container = document.getElementById("horarios-disponibles-container");
    container.innerHTML = ""; // Limpiar

    if (slots.length === 0) {
        container.innerHTML = `<p class="text-danger">No hay horarios disponibles para esta fecha.</p>`;
        return;
    }

    slots.forEach(slot => {
        const col = document.createElement("div");
        col.className = "col-4 col-md-3";
        col.innerHTML = `
            <button class="btn btn-outline-secondary w-100 btn-horario" data-time="${slot}">
                ${slot}
            </button>
        `;
        container.appendChild(col);
    });
}

/**
 * Configura los event listeners para la página.
 */
function setupListeners() {
    const horariosContainer = document.getElementById("horarios-disponibles-container");
    
    // Listener para los botones de horario (usa delegación de eventos)
    horariosContainer.addEventListener("click", function(e) {
        if (e.target.classList.contains("btn-horario")) {
            // Quitar 'active' de otros botones
            horariosContainer.querySelectorAll(".btn-horario").forEach(btn => btn.classList.remove("active"));
            
            // Añadir 'active' al clickeado
            e.target.classList.add("active");
            
            horaSeleccionada = e.target.getAttribute("data-time");
            console.log("Hora seleccionada:", horaSeleccionada);
            
            // Habilitar botón final
            document.getElementById("btn-confirmar-reserva").disabled = false;
        }
    });

    // Listener para el botón de confirmar (PENDIENTE)
    document.getElementById("btn-confirmar-reserva").addEventListener("click", function() {
        if (servicioSeleccionado && fechaSeleccionada && horaSeleccionada) {
            handleConfirmarReserva();
        } else {
            console.warn("Faltan datos para confirmar la reserva.");
        }
    });
}

/**
 * [PENDIENTE] Maneja el clic final para confirmar la reserva.
 */
function handleConfirmarReserva() {
    console.log("--- RESERVA LISTA PARA PROCESAR ---");
    console.log("Servicio:", servicioSeleccionado);
    console.log("Fecha:", fechaSeleccionada);
    console.log("Hora:", horaSeleccionada);
    console.log("Total a Pagar:", document.getElementById("resumen-total").textContent);

    // Próximos pasos:
    // 1. Crear el registro en la tabla `bookings` de Supabase.
    // 2. Integrar pasarela de pago (Tarea 5).
    // 3. Enviar email (Tarea 6).
    alert("¡Reserva confirmada (simulación)!");
}


// --- Funciones de Utilidad (copiadas de servicios.js) ---

function formatPrice(price) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
    }).format(price);
}

function formatDuration(minutes) {
    if (minutes < 60) {
        return `${minutes} min`;
    } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0
            ? `${hours}h ${remainingMinutes}min`
            : `${hours}h`;
    }
}