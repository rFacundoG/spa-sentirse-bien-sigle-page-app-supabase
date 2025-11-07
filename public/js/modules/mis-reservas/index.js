// public/js/modules/mis-reservas/index.js

// Importamos los nuevos módulos
import * as api from "./api.js";
import * as ui from "./ui.js";

// --- Estado Global del Módulo ---
let paymentModal = null;
let currentBookingToPay = null;
let finalPaymentAmount = 0;
let moduleBookings = []; // Caché de las reservas

/**
 * Función principal llamada por el Router.
 */
export function initMisReservasPage() {
  const modalEl = document.getElementById("paymentSimulationModal");
  if (modalEl) {
    paymentModal = new bootstrap.Modal(modalEl);
  } else {
    console.warn("Modal de simulación de pago no encontrado.");
  }

  loadUserBookings(); // Carga inicial
  setupListeners();
}

/**
 * Configura los listeners de la página
 */
function setupListeners() {
  // Listener para los botones "Pagar Ahora" (delegación)
  const container = document.getElementById("reservas-list-container");
  if (container) {
    container.addEventListener("click", (event) => {
      const payButton = event.target.closest(".btn-pay-now");
      if (payButton) {
        const bookingId = payButton.getAttribute("data-booking-id");
        handlePayNowClick(bookingId);
      }
    });
  }

  // Listener para el botón "Pagar" DENTRO del modal
  const modalPayBtn = document.getElementById("btn-modal-pagar");
  if (modalPayBtn) {
    modalPayBtn.addEventListener("click", handleModalPayment);
  }
}

/**
 * Orquestador: Carga datos de la API y llama a la UI.
 */
async function loadUserBookings() {
  if (!window.currentUser || !window.currentUser.id) {
    ui.showMessage("Debes iniciar sesión para ver tus reservas.");
    return;
  }

  ui.showLoader(true); // Mostrar loader

  try {
    console.log(
      "Debug MisReservas: ID de usuario enviado:",
      window.currentUser.id
    );
    const bookings = await api.fetchUserBookings(window.currentUser.id);
    console.log("Debug MisReservas: Datos recibidos de Supabase:", bookings);
    ui.showLoader(false);
    moduleBookings = bookings; // Guardar en caché

    if (moduleBookings.length > 0) {
      ui.renderBookings(
        moduleBookings,
        document.getElementById("reservas-list-container")
      );
    } else {
      ui.showMessage("Aún no tienes ninguna reserva registrada.");
    }
  } catch (error) {
    ui.showLoader(false);
    ui.showMessage(
      "Error al cargar tus reservas. Por favor, intenta de nuevo."
    );
    console.error("Debug MisReservas: Error en el bloque try/catch:", error);
  }
}

/**
 * Lógica de Negocio: Se dispara al hacer clic en "Pagar Ahora".
 * Decide el precio (Regla 48hs) y muestra el modal.
 */
function handlePayNowClick(bookingId) {
  const bookingToPay = moduleBookings.find(
    (b) => b.id.toString() === bookingId
  );
  if (!bookingToPay) {
    console.error("No se encontró la reserva para pagar.");
    return;
  }

  // REGLA 3: Descuento de 48hs
  const now = new Date();
  const appointmentTime = new Date(bookingToPay.appointment_datetime);
  const hoursRemaining = (appointmentTime - now) / 3600000;

  let priceToPay = bookingToPay.subtotal; // El precio completo
  let discountAmount = 0; // El descuento por defecto es 0

  if (hoursRemaining >= 48) {
    // Aplicar 15% de descuento
    discountAmount = priceToPay * 0.15;
    priceToPay = priceToPay - discountAmount;
    console.log("¡Descuento de 48hs aplicado!");
  }

  // Guardar estado para el modal
  currentBookingToPay = bookingToPay;
  finalPaymentAmount = priceToPay;

  // Preparamos el objeto de desglose para la UI
  const priceDetails = {
    subtotal: bookingToPay.subtotal,
    discountAmount: discountAmount,
    priceToPay: priceToPay,
  };

  // Llamar a la UI para mostrar el modal con el desglose
  ui.showPaymentModal(paymentModal, priceDetails);
}

/**
 * Lógica de Negocio: Se dispara al pagar en el modal.
 */
async function handleModalPayment() {
  if (!currentBookingToPay) return;

  // 1. Mostrar loader en modal (llamada a la UI)
  ui.showModalLoader(paymentModal);

  // 2. Simular espera
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // 3. Ocultar modal (llamada a la UI)
  ui.hidePaymentModal(paymentModal);

  // 4. Llamar a la función que actualiza Supabase
  await executeUpdatePayment();
}

/**
 * Orquestador: Llama a la API para actualizar el pago.
 */
async function executeUpdatePayment() {
  const bookingId = currentBookingToPay.id;
  const discountAmount = currentBookingToPay.subtotal - finalPaymentAmount;
  const transactionId = `sim-${Date.now()}`; // Creamos un ID de transacción simulado

  // Preparamos los datos del PAGO
  const paymentData = {
    booking_id: bookingId,
    user_id: window.currentUser.id,
    amount_paid: finalPaymentAmount,
    discount_applied: discountAmount,
    payment_method: "debit_card", // Lo sabemos porque solo este método llama al modal
    transaction_id: transactionId,
    status: "succeeded",
  };

  try {
    // ¡NUEVA LLAMADA A LA API! (La crearemos en el Paso 5)
    await api.registerPaymentAndUpdateBooking(paymentData);

    ui.showSafeToast("¡Pago completado con éxito!", "success");

    // Refrescar la lista para mostrar el nuevo estado "Pagado"
    loadUserBookings();
  } catch (error) {
    ui.showSafeToast("Error al procesar el pago.", "danger");
  } finally {
    // Limpiar estado
    currentBookingToPay = null;
    finalPaymentAmount = 0;
  }
}
