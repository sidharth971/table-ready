import { create } from 'zustand';

const API_BASE = 'http://127.0.0.1:8000/api';
const WS_BASE = 'ws://127.0.0.1:8000/ws/orders';

export const useStore = create((set, get) => ({
  menu: [],
  cart: [],
  activeTableId: null,
  activeOrders: [],
  allOrders: [], // Track all orders for the user dashboard
  customerOrder: null, // Track current customer's order for tracking/feedback (kept for legacy support)
  customerOrders: [], // Track all customer's orders for the current table session
  ws: null,

  setTableId: (tableId) => set({ activeTableId: tableId }),

  fetchMenu: async () => {
    try {
      const response = await fetch(`${API_BASE}/menu`);
      if (!response.ok) throw new Error('Failed to fetch menu');
      const data = await response.ok ? await response.json() : [];
      set({ menu: data });
    } catch (error) {
      console.error('Error fetching menu:', error);
    }
  },

  addToCart: (item, variant = null) => {
    const { cart } = get();
    // For items with variants, price depends on variant.
    const price = item.is_multi_price ? item.prices[variant] : item.price;
    
    const existingIndex = cart.findIndex(
      (cartItem) => cartItem.item_id === item._id && cartItem.selected_variant === variant
    );

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      set({ cart: updatedCart });
    } else {
      set({
        cart: [
          ...cart,
          {
            item_id: item._id,
            name: item.name,
            selected_variant: variant,
            quantity: 1,
            price: price,
          },
        ],
      });
    }
  },

  removeFromCart: (itemId, variant = null) => {
    const { cart } = get();
    const existingIndex = cart.findIndex(
      (cartItem) => cartItem.item_id === itemId && cartItem.selected_variant === variant
    );

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      if (updatedCart[existingIndex].quantity > 1) {
        updatedCart[existingIndex].quantity -= 1;
      } else {
        updatedCart.splice(existingIndex, 1);
      }
      set({ cart: updatedCart });
    }
  },

  clearCart: () => set({ cart: [] }),

  placeOrder: async () => {
    const { cart, activeTableId } = get();
    if (cart.length === 0) return null;

    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderPayload = {
      table_id: activeTableId || 'unknown_table',
      items: cart.map(item => ({
        item_id: item.item_id,
        name: item.name,
        quantity: item.quantity,
        selected_variant: item.selected_variant,
        price: item.price
      })),
      total_amount: totalAmount,
      status: 'Preparing'
    };

    try {
      const response = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) throw new Error('Failed to place order');
      const orderResult = await response.json();
      
      // Save customer order locally for tracking and rating
      const currentOrders = get().customerOrders || [];
      const updatedOrders = [...currentOrders, orderResult];
      set({ 
        customerOrders: updatedOrders,
        customerOrder: orderResult, 
        cart: [] 
      });
      
      // Store in localStorage so it persists across refreshes for the customer
      localStorage.setItem('customer_orders', JSON.stringify(updatedOrders));
      localStorage.setItem('customer_order', JSON.stringify(orderResult));
      return orderResult;
    } catch (error) {
      console.error('Error placing order:', error);
      return null;
    }
  },

  fetchTableOrders: async (tableId) => {
    try {
      const response = await fetch(`${API_BASE}/orders/table/${tableId}`);
      if (!response.ok) throw new Error('Failed to fetch table orders');
      const data = await response.json();
      set({ customerOrders: data });
      if (data.length > 0) {
        set({ customerOrder: data[data.length - 1] });
      }
    } catch (error) {
      console.error('Error fetching table orders:', error);
    }
  },

  fetchAllOrders: async () => {
    try {
      const response = await fetch(`${API_BASE}/orders`);
      if (!response.ok) throw new Error('Failed to fetch all orders');
      const data = await response.json();
      set({ allOrders: data });
    } catch (error) {
      console.error('Error fetching all orders:', error);
    }
  },

  fetchActiveOrders: async () => {
    try {
      const response = await fetch(`${API_BASE}/orders/active`);
      if (!response.ok) throw new Error('Failed to fetch active orders');
      const data = await response.json();
      set({ activeOrders: data });
    } catch (error) {
      console.error('Error fetching active orders:', error);
    }
  },

  updateOrderStatus: async (orderId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      const updatedOrder = await response.json();
      
      // Update state locally
      const { activeOrders, customerOrder, customerOrders = [] } = get();
      
      // If order is completed (Delivered), remove from active kitchen orders, else update status
      let newActiveOrders;
      if (newStatus === 'Delivered') {
        newActiveOrders = activeOrders.filter(o => o._id !== orderId);
      } else {
        newActiveOrders = activeOrders.map(o => o._id === orderId ? updatedOrder : o);
      }
      
      set({ activeOrders: newActiveOrders });

      // Update allOrders if this order exists in it
      const { allOrders = [] } = get();
      if (allOrders.some(o => o._id === orderId)) {
        const updatedAllOrders = allOrders.map(o => o._id === orderId ? updatedOrder : o);
        set({ allOrders: updatedAllOrders });
      }

      // Update customerOrders if this order belongs to this customer
      if (customerOrders.some(o => o._id === orderId)) {
        const updatedCustomerOrders = customerOrders.map(o => o._id === orderId ? updatedOrder : o);
        set({ customerOrders: updatedCustomerOrders });
        localStorage.setItem('customer_orders', JSON.stringify(updatedCustomerOrders));
      }

      // If this is the active customer order, update its status
      if (customerOrder && customerOrder._id === orderId) {
        set({ customerOrder: updatedOrder });
        localStorage.setItem('customer_order', JSON.stringify(updatedOrder));
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  },

  submitFeedback: async (orderId, waiterRating, itemFeedbacks, overallComments) => {
    const { customerOrders = [], customerOrder } = get();
    const targetOrder = customerOrders.find(o => o._id === orderId) || (customerOrder && customerOrder._id === orderId ? customerOrder : null);
    if (!targetOrder) return false;

    const payload = {
      order_id: orderId,
      waiter_rating: waiterRating,
      items_feedback: itemFeedbacks.map(f => ({
        item_id: f.item_id,
        item_name: f.name,
        rating: f.rating,
        comments: f.comments || ''
      })),
      overall_comments: overallComments
    };

    try {
      const response = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to submit feedback');
      
      // Mark feedback as submitted locally
      const updatedCustomerOrders = customerOrders.map(o => {
        if (o._id === orderId) {
          return { ...o, feedback_submitted: true };
        }
        return o;
      });

      const updatedOrder = { ...targetOrder, feedback_submitted: true };

      set({ 
        customerOrders: updatedCustomerOrders,
        customerOrder: customerOrder && customerOrder._id === orderId ? updatedOrder : customerOrder
      });

      localStorage.setItem('customer_orders', JSON.stringify(updatedCustomerOrders));
      if (customerOrder && customerOrder._id === orderId) {
        localStorage.setItem('customer_order', JSON.stringify(updatedOrder));
      }
      return true;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return false;
    }
  },

  loadPersistedOrder: () => {
    const persistedOrders = localStorage.getItem('customer_orders');
    if (persistedOrders) {
      try {
        const orders = JSON.parse(persistedOrders);
        set({ customerOrders: orders, customerOrder: orders[orders.length - 1] || null });
      } catch (e) {
        localStorage.removeItem('customer_orders');
      }
    } else {
      // Fallback/Legacy
      const persisted = localStorage.getItem('customer_order');
      if (persisted) {
        try {
          const order = JSON.parse(persisted);
          set({ customerOrders: [order], customerOrder: order });
        } catch (e) {
          localStorage.removeItem('customer_order');
        }
      }
    }
  },

  clearPersistedOrder: () => {
    localStorage.removeItem('customer_order');
    localStorage.removeItem('customer_orders');
    set({ customerOrder: null, customerOrders: [] });
  },

  connectWebSocket: () => {
    const currentWs = get().ws;
    if (currentWs) return; // Already connected

    const socket = new WebSocket(WS_BASE);

    socket.onopen = () => {
      console.log('WebSocket connected.');
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { event: eventName, order } = message;
        const { activeOrders, customerOrder } = get();

        if (eventName === 'new_order') {
          // Play notification sound on kitchen monitor if window focused
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav');
            audio.play().catch(() => {});
          } catch(e) {}
          
          set({ activeOrders: [...activeOrders, order] });

          const currentAllOrders = get().allOrders || [];
          set({ allOrders: [order, ...currentAllOrders] });
        } 
        
        else if (eventName === 'order_updated') {
          // Update active orders list
          let newActiveOrders;
          if (order.status === 'Delivered') {
            newActiveOrders = activeOrders.filter(o => o._id !== order._id);
          } else {
            // If it exists, update it. If it doesn't exist yet but is active, add it.
            const exists = activeOrders.some(o => o._id === order._id);
            if (exists) {
              newActiveOrders = activeOrders.map(o => o._id === order._id ? order : o);
            } else {
              newActiveOrders = [...activeOrders, order];
            }
          }
          set({ activeOrders: newActiveOrders });

          // Update allOrders list
          const currentAllOrders = get().allOrders || [];
          if (currentAllOrders.some(o => o._id === order._id)) {
            const updatedAllOrders = currentAllOrders.map(o => o._id === order._id ? order : o);
            set({ allOrders: updatedAllOrders });
          } else {
            set({ allOrders: [order, ...currentAllOrders] });
          }

          // Update customer orders if it matches
          const currentCustomerOrders = get().customerOrders || [];
          if (currentCustomerOrders.some(o => o._id === order._id)) {
            const updatedCustomerOrders = currentCustomerOrders.map(o => o._id === order._id ? order : o);
            set({ customerOrders: updatedCustomerOrders });
            localStorage.setItem('customer_orders', JSON.stringify(updatedCustomerOrders));
          }

          // Update customer order if it matches
          if (customerOrder && customerOrder._id === order._id) {
            set({ customerOrder: order });
            localStorage.setItem('customer_order', JSON.stringify(order));
          }
        }
      } catch (err) {
        console.error('Error handling WS message:', err);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected. Reconnecting in 5s...');
      set({ ws: null });
      setTimeout(() => get().connectWebSocket(), 5000);
    };

    set({ ws: socket });
  },

  disconnectWebSocket: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
      set({ ws: null });
    }
  }
}));
