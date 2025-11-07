// 1. IMPORTAR TODOS LOS MÓDULOS
import * as ui from "./ui.js"; // ui.js ahora tiene las funciones de producto
import * as api from "./api.js";
import { ReservationContext } from "./context.js";

// MODIFICADO: Importamos todas las estrategias (de servicios y productos)
import {
  DebitCardStrategy,
  CashStrategy,
  NoDiscountStrategy,
  ProductCashStrategy,  // NUEVO: Estrategia de productos (10% efectivo)
  ProductDebitStrategy  // NUEVO: Estrategia de productos (0% débito)
} from "../payment/strategies.js";

// 2. DEFINIR EL ESTADO DE LA PÁGINA
let serviceCartItems = [];      // Carrito de servicios
let serviceContext;             // Contexto de descuento para servicios

// NUEVO: Estado para el carrito de productos
let productCartItems = [];      // Carrito de productos
let productContext;             // Contexto de descuento para productos
let activeTab = 'servicios';    // Estado para saber qué pestaña está activa

/**
 * FUNCIÓN PRINCIPAL (Llamada por el Router)
 * MODIFICADO: Ahora inicializa ambos carritos.
 */
export function initCheckoutPage() {
  // 1. Cargar el carrito de SERVICIOS (Lógica de tu compañero)
  const serviceCarritoJSON = localStorage.getItem("carritoServicios");
  serviceCartItems = serviceCarritoJSON ? JSON.parse(serviceCarritoJSON) : [];
  const serviceSubtotal = ui.renderCartItems(serviceCartItems);
  serviceContext = new ReservationContext(serviceSubtotal);

  // 2. NUEVO: Cargar el carrito de PRODUCTOS
  const productCarritoJSON = localStorage.getItem("carritoProductos");
  productCartItems = productCarritoJSON ? JSON.parse(productCarritoJSON) : [];
  const productSubtotal = ui.renderProductCartItems(productCartItems); // Usamos la nueva función de ui.js
  productContext = new ReservationContext(productSubtotal); // Creamos su propio contexto

  // 3. Configurar los listeners
  setupListeners();

  // 4. Calcular y mostrar los totales iniciales (de la pestaña 'servicios' por defecto)
  updatePaymentStrategy(); // Aplicar descuentos
  updateTotals(); // Mostrar en el resumen principal
  
  // NUEVO: Calcular totales internos de la pestaña productos (para que se vean al cambiar)
  updateProductTotalsUI(); 

  // 5. Validar estado inicial
  const { payment_method } = ui.getFormValues();
  ui.validateBusinessRules(payment_method);
}

/**
 * Configura los listeners para PESTAÑAS, PAGOS, BOTÓN y CANTIDADES.
 * (MODIFICADO)
 */
function setupListeners() {
  // --- Listeners de Pestañas (NUEVO) ---
  const tabButtons = document.querySelectorAll('#checkoutTabs button[data-bs-toggle="tab"]');
  tabButtons.forEach(tab => {
    tab.addEventListener('shown.bs.tab', handleTabChange); // 'shown.bs.tab' es el evento de Bootstrap
  });

  // --- Listener de Métodos de Pago (MODIFICADO) ---
  // (Apunta al wrapper global)
  const radioInputs = document.querySelectorAll('#payment-options-wrapper input[name="payment"]');
  radioInputs.forEach((input) => {
    input.addEventListener("change", handlePaymentChange);
  });

  // --- Listener del Botón Principal (MODIFICADO) ---
  const confirmButton = document.getElementById("btn-confirmar-checkout");
  confirmButton.addEventListener("click", handleConfirmCheckout);
  
  // --- Listeners de Carrito de Productos (NUEVO) ---
  const productContainer = document.getElementById("productos-items-container");
  if (productContainer) {
    // Listener para cambiar cantidad
    productContainer.addEventListener("change", (e) => {
      if (e.target.classList.contains("product-quantity-input")) {
        handleProductCartChange(e.target.dataset.id, e.target.value);
      }
    });
    // Listener para eliminar item
    productContainer.addEventListener("click", (e) => {
      const removeBtn = e.target.closest(".btn-remove-product");
      if (removeBtn) {
        handleProductCartChange(removeBtn.dataset.id, 0); // Cantidad 0 = eliminar
      }
    });
  }
}

/**
 * NUEVO: Se dispara CADA VEZ que el usuario cambia de pestaña.
 */
function handleTabChange(event) {
  activeTab = event.target.id === 'servicios-tab' ? 'servicios' : 'productos';
  console.log("Pestaña activa:", activeTab);

  const confirmButton = document.getElementById("btn-confirmar-checkout");
  
  // 1. Actualizar etiquetas de descuento y texto del botón
  if (activeTab === 'servicios') {
    ui.updatePaymentLabels('servicios');
    confirmButton.innerHTML = "Confirmar Reserva";
  } else {
    ui.updatePaymentLabels('productos');
    confirmButton.innerHTML = "Confirmar Compra";
  }

  // 2. Recalcular y mostrar el total de la pestaña activa en el resumen principal
  updateTotals();
  
  // 3. Validar el estado (por si el carrito de la nueva pestaña está vacío)
  const { payment_method } = ui.getFormValues();
  ui.validateBusinessRules(payment_method); // Re-validar
}

/**
 * Se dispara CADA VEZ que el usuario cambia una opción de PAGO.
 */
function handlePaymentChange() {
  const { payment_method } = ui.getFormValues();

  // 1. Validar reglas de negocio
  ui.validateBusinessRules(payment_method);

  // 2. Actualizar AMBAS estrategias (servicios y productos)
  updatePaymentStrategy();

  // 3. Recalcular y mostrar el total (solo de la pestaña activa)
  updateTotals();
  
  // 4. NUEVO: Recalcular también el sub-resumen de productos
  updateProductTotalsUI();
}

/**
 * NUEVO: Se dispara al cambiar cantidad o eliminar un PRODUCTO.
 */
function handleProductCartChange(productId, newQuantity) {
  const quantity = parseInt(newQuantity);

  if (isNaN(quantity) || quantity < 0) return; // Valor inválido

  if (quantity === 0) {
    productCartItems = productCartItems.filter((item) => item.id !== productId);
  } else {
    productCartItems = productCartItems.map((item) => {
      if (item.id === productId) {
        return { ...item, quantity: quantity };
      }
      return item;
    });
  }

  // Guardar el carrito de productos actualizado
  localStorage.setItem("carritoProductos", JSON.stringify(productCartItems));

  // Recalcular todo
  // 1. Redibujar el carrito de productos (esto nos da el nuevo subtotal)
  const newProductSubtotal = ui.renderProductCartItems(productCartItems);
  
  // 2. Actualizar el contexto de productos con el nuevo subtotal
  productContext.subtotal = newProductSubtotal;
  
  // 3. Recalcular descuentos de productos y actualizar su UI interna
  updateProductTotalsUI();
  
  // 4. Recalcular el resumen TOTAL (solo si la pestaña de productos está activa)
  if (activeTab === 'productos') {
    updateTotals();
  }
}

/**
 * NUEVO: Lee el método de pago y aplica la estrategia correcta a CADA contexto.
 */
function updatePaymentStrategy() {
  const { payment_method } = ui.getFormValues();

  // 1. Estrategia de SERVICIOS (15% débito)
  if (payment_method === "debit_card") {
    serviceContext.setStrategy(new DebitCardStrategy());
  } else if (payment_method === "cash") {
    serviceContext.setStrategy(new CashStrategy());
  } else {
    serviceContext.setStrategy(new NoDiscountStrategy());
  }

  // 2. Estrategia de PRODUCTOS (10% efectivo)
  if (payment_method === "cash") {
    productContext.setStrategy(new ProductCashStrategy());
  } else if (payment_method === "debit_card") {
    productContext.setStrategy(new ProductDebitStrategy());
  } else {
    productContext.setStrategy(new NoDiscountStrategy());
  }
}

/**
 * Recalcula y actualiza la UI del RESUMEN PRINCIPAL (derecha).
 * (MODIFICADO: Ahora depende de 'activeTab')
 */
function updateTotals() {
  let subtotal = 0;
  let discountAmount = 0;
  let newTotal = 0;

  if (activeTab === 'servicios') {
    // Calcular totales de SERVICIOS
    const summary = serviceContext.calculateTotal();
    subtotal = serviceContext.subtotal;
    discountAmount = summary.discountAmount;
    newTotal = summary.newTotal;
  } else {
    // Calcular totales de PRODUCTOS
    const summary = productContext.calculateTotal();
    subtotal = productContext.subtotal;
    discountAmount = summary.discountAmount;
    newTotal = summary.newTotal;
  }

  // Actualizar el Resumen de Pago principal
  ui.updateTotalsUI({
    subtotal: subtotal,
    discountAmount: discountAmount,
    newTotal: newTotal,
  });
}

/**
 * NUEVO: Recalcula y actualiza la UI INTERNA de la pestaña de productos.
 */
function updateProductTotalsUI() {
  const { discountAmount, newTotal } = productContext.calculateTotal();

  // Llama a la nueva función de ui.js
  ui.updateProductTotalsUI({
    subtotal: productContext.subtotal,
    discountAmount: discountAmount,
  });
}

/**
 * Maneja el clic final en el botón principal.
 * (MODIFICADO: Decide qué función llamar basado en 'activeTab')
 */
function handleConfirmCheckout() {
  if (activeTab === 'servicios') {
    handleConfirmServices();
  } else {
    handleConfirmProducts();
  }
}

/**
 * Lógica para confirmar SÓLO SERVICIOS.
 * (Es tu 'handleConfirmBooking' original, renombrado)
 */
async function handleConfirmServices() {
  console.log("Confirmando RESERVA de servicios...");
  const { delivery_method, payment_method } = ui.getFormValues();

  if (!ui.validateBusinessRules(payment_method)) { // No necesitamos delivery_method aquí
    showSafeToast("Por favor, corrige los errores en tu pedido.", "danger");
    return;
  }
  if (!window.currentUser) {
    showSafeToast("Debes iniciar sesión para reservar.", "warning");
    return;
  }
  if (serviceCartItems.length === 0) {
    showSafeToast("Tu carrito de servicios está vacío.", "warning");
    return;
  }

  const { discountAmount, newTotal } = serviceContext.calculateTotal();

  const bookingData = {
    user_id: window.currentUser.id,
    subtotal: serviceContext.subtotal,
    discount_applied: discountAmount,
    total_price: newTotal,
    payment_method: payment_method,
    delivery_method: delivery_method, // 'in_spa'
  };

  const confirmBtn = document.getElementById("btn-confirmar-checkout");
  try {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = "Procesando Reserva...";

    // Llamamos a la API original (solo con servicios)
    const result = await api.saveBooking(bookingData, serviceCartItems);

    if (result.success) {
      showSafeToast("¡Reserva creada con éxito!", "success");
      localStorage.removeItem("carritoServicios");
      window.location.hash = "#home";
    } else {
      throw new Error("La API de guardado de servicios no tuvo éxito.");
    }
  } catch (error) {
    console.error("Error al confirmar la reserva:", error);
    showSafeToast("Error al procesar tu reserva. Intenta de nuevo.", "danger");
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = "Confirmar Reserva";
  }
}

/**
 * NUEVO: Lógica para confirmar SÓLO PRODUCTOS.
 */
async function handleConfirmProducts() {
  console.log("Confirmando COMPRA de productos...");
  const { payment_method } = ui.getFormValues();

  if (!ui.validateBusinessRules(payment_method)) {
    showSafeToast("Por favor, selecciona un método de pago.", "danger");
    return;
  }
  if (!window.currentUser) {
    showSafeToast("Debes iniciar sesión para comprar.", "warning");
    return;
  }
  if (productCartItems.length === 0) {
    showSafeToast("Tu carrito de productos está vacío.", "warning");
    return;
  }

  const { discountAmount, newTotal } = productContext.calculateTotal();

  const purchaseData = {
    user_id: window.currentUser.id,
    subtotal: productContext.subtotal,
    discount_applied: discountAmount,
    total_price: newTotal,
    payment_method: payment_method,
    delivery_method: 'product_purchase', // Un valor para distinguirlo
  };
  
  const confirmBtn = document.getElementById("btn-confirmar-checkout");
  try {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = "Procesando Compra...";

    // Llamamos a la nueva función que creamos en api.js (Paso 8)
    const result = await api.saveProductPurchase(purchaseData, productCartItems);
    
    if (result.success) {
      showSafeToast("¡Compra de productos realizada con éxito!", "success");
      localStorage.removeItem("carritoProductos");
      window.location.hash = "#home";
    } else {
      throw new Error("La API de guardado de productos no tuvo éxito.");
    }
  } catch (error) {
    console.error("Error al confirmar la compra:", error);
    showSafeToast("Error al procesar tu compra. Intenta de nuevo.", "danger");
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = "Confirmar Compra";
  }
}

/**
 * Función helper para mostrar notificaciones (toast) de forma segura.
 * (Sin cambios)
 */
function showSafeToast(message, type = "info") {
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
  } else {
    alert(message);
  }
}