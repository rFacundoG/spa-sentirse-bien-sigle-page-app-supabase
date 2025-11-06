// public/js/modules/reservas/api.js
import { supabase } from "../../core/supabase.js";

export async function saveBooking(bookingData, cartItems) {
  // Mapeamos el carrito al JSON que espera la función SQL
  const items_json = cartItems.map((item) => ({
    service_id: item.id,
    price_at_purchase: item.price,
    // Dejamos el 'professional_id' como null por ahora
    // En el futuro, el 'item' del carrito tendrá este dato
    professional_id: item.professional_id || null 
  }));

  const rpc_args = {
    user_id_input: bookingData.user_id,
    total_price_input: bookingData.total_price,
    subtotal_input: bookingData.subtotal,
    discount_input: bookingData.discount_applied,
    payment_method_input: bookingData.payment_method,
    delivery_method_input: bookingData.delivery_method,
    items: items_json,
  };

  const { data, error } = await supabase.rpc(
    "create_booking_with_items",
    rpc_args
  );

  if (error) {
    console.error("Error al guardar la reserva:", error);
    throw error;
  }

  return { success: true, bookingId: data };
}