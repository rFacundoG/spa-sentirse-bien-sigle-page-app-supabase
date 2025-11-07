// public/js/modules/checkout/index.js

import * as ui from "./ui.js";
import * as api from "./api.js";
import { ReservationContext } from "./context.js";
import {
  DebitCardStrategy,
  CashStrategy,
  NoDiscountStrategy,
} from "../payment/strategies.js";

let cartItems = [];
let reservationContext;
let selectedDateTime = null; // <-- NUEVO: Variable para la fecha

/**
 * FUNCIÓN PRINCIPAL
 */
export function initCheckoutPage() {
  const carritoJSON = localStorage.getItem("carritoServicios");
  cartItems = carritoJSON ? JSON.parse(carritoJSON) : [];

  const subtotal = ui.renderCartItems(cartItems);
  reservationContext = new ReservationContext(subtotal);
  updateTotals();

  initCalendar(); // <-- NUEVO: Inicializar el calendario
  setupListeners();

  // <-- MODIFICADO: Pasamos la fecha (null) a la validación inicial
  const { delivery_method, payment_method } = ui.getFormValues();
  ui.validateBusinessRules(payment_method, delivery_method, selectedDateTime);
}

/**
 * NUEVO: Inicializa Flatpickr con la regla de 48hs
 */
function initCalendar() {
  // Regla de 48 horas: new Date().fp_incr(2) significa "Hoy + 2 días"
  const minDate = new Date().fp_incr(2);

  flatpickr("#datepicker-checkout", {
    enableTime: true,
    dateFormat: "Y-m-d H:i", // Formato (Año-Mes-Día Hora:Minuto)
    minDate: minDate,
    time_24hr: true,
    minuteIncrement: 30, // Turnos cada 30 min
    // Se dispara cuando el usuario SELECCIONA una fecha
    onChange: function (selectedDates) {
      selectedDateTime = selectedDates[0]; // Guarda la fecha
      // Re-valida las reglas cada vez que cambia la fecha
      handleFormChange();
    },
  });
}

/**
 * Configura los listeners
 */
function setupListeners() {
  const radioInputs = document.querySelectorAll(
    '#payment-options-wrapper input[name="payment"]'
  );
  radioInputs.forEach((input) => {
    input.addEventListener("change", handleFormChange);
  });

  const confirmButton = document.getElementById("btn-confirmar-checkout");
  confirmButton.addEventListener("click", handleConfirmBooking);
}

/**
 * MODIFICADO: Se dispara al cambiar el método de pago O la fecha.
 */
function handleFormChange() {
  const { delivery_method, payment_method } = ui.getFormValues();

  // AHORA PASAMOS LA FECHA A LA VALIDACIÓN
  ui.validateBusinessRules(payment_method);

  // (El resto de la lógica de Strategy sigue igual...)
  if (payment_method === "debit_card") {
    reservationContext.setStrategy(new DebitCardStrategy());
  } else if (payment_method === "cash") {
    reservationContext.setStrategy(new CashStrategy());
  } else {
    reservationContext.setStrategy(new NoDiscountStrategy());
  }

  updateTotals();
}

/**
 * (Sin cambios) Recalcula y actualiza la UI con los totales.
 */
function updateTotals() {
  const subtotal = reservationContext.subtotal;
  const { discountAmount, newTotal } = reservationContext.calculateTotal();

  ui.updateTotalsUI({
    subtotal: subtotal,
    discountAmount: discountAmount,
    newTotal: newTotal,
  });
}

/**
 * MODIFICADO: Maneja el clic final en "Confirmar Reserva".
 */
async function handleConfirmBooking() {
  const { delivery_method, payment_method } = ui.getFormValues();

  // 1. Validar por última vez (esto no cambia)
  if (
    !ui.validateBusinessRules(payment_method, delivery_method, selectedDateTime)
  ) {
    showSafeToast("Por favor, completa todos los campos requeridos.", "danger");
    return;
  }

  if (!window.currentUser) {
    showSafeToast("Debes iniciar sesión para reservar.", "warning");
    return;
  }

  if (cartItems.length === 0) {
    showSafeToast(
      "Tu carrito está vacío. Añade un servicio para reservar.",
      "warning"
    );
    return;
  }

  // 2. Preparar el objeto para la API (¡ESTE ES EL CAMBIO CLAVE!)
  // Usamos el 'subtotal' del contexto, ignorando el descuento calculado.
  const bookingData = {
    user_id: window.currentUser.id,
    subtotal: reservationContext.subtotal, // <-- ENVIAMOS EL PRECIO COMPLETO
    payment_method: payment_method,
    delivery_method: delivery_method,
    appointment_datetime: selectedDateTime.toISOString(),
  };

  try {
    const confirmBtn = document.getElementById("btn-confirmar-checkout");
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = "Procesando...";

    // 4. Llamar a la API
    const result = await api.saveBooking(bookingData, cartItems);

    if (result.success) {
      showSafeToast(
        '¡Reserva confirmada! Ahora puedes pagarla desde "Mis Reservas".',
        "success"
      );
      localStorage.removeItem("carritoServicios");
      // REDIRIGE A "MIS RESERVAS"
      window.location.hash = "#reservas";
    } else {
      throw new Error("La API de guardado no tuvo éxito.");
    }
  } catch (error) {
    console.error("Error al confirmar la reserva:", error);
    showSafeToast("Error al procesar tu reserva. Intenta de nuevo.", "danger");

    const confirmBtn = document.getElementById("btn-confirmar-checkout");
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = "Confirmar Reserva";
  }
}

/**
 * (Sin cambios) Función helper para mostrar notificaciones (toast) de forma segura.
 */
function showSafeToast(message, type = "info") {
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
  } else {
    alert(message);
  }
}
