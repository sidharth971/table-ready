import React, { useEffect, useState } from 'react';
import { useStore } from './store';
import { 
  ShoppingBag, Check, Star, Clock, Bell, Trash2, 
  Plus, Minus, ChevronRight, CheckCircle2, Play, Award, ClipboardList,
  LayoutList, LayoutGrid, ChefHat, Sparkles, Utensils
} from 'lucide-react';

// --- MAIN ROUTER APP ---
export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const loadPersistedOrder = useStore(state => state.loadPersistedOrder);
  const connectWebSocket = useStore(state => state.connectWebSocket);

  useEffect(() => {
    // Load customer order if they already ordered
    loadPersistedOrder();
    // Connect websocket for real-time notifications
    connectWebSocket();

    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Simple Router logic
  if (currentPath === '/kitchen') {
    return <KitchenDashboard />;
  }

  if (currentPath === '/dashboard') {
    return <UserDashboard />;
  }

  if (currentPath.startsWith('/menu/')) {
    const tableId = currentPath.split('/menu/')[1];
    return <CustomerMenu tableId={tableId} />;
  }

  // Welcome / Entry page to easily navigate to menu or kitchen
  return <WelcomeScreen />;
}

// --- WELCOME/TEST SCREEN ---
function WelcomeScreen() {
  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopEvent('popstate'));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#09090b]">
      <div className="max-w-md w-full glass-panel rounded-3xl p-8 text-center border border-white/5 shadow-2xl">
        <div className="w-20 h-20 bg-restaurant-accent/10 border border-restaurant-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10 text-restaurant-accent" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">TableReady</h1>
        <p className="text-restaurant-textMuted mb-8 text-sm">Restaurant Automation Web Suite</p>
        
        <div className="space-y-4">
          <button 
            onClick={() => navigate('/menu/table_4')}
            className="w-full py-4 px-6 bg-restaurant-accent hover:bg-restaurant-accentHover text-white font-semibold rounded-xl flex items-center justify-between transition-all shadow-lg shadow-restaurant-accent/10 hover:shadow-restaurant-accent/20"
          >
            <span className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              Customer Menu (Table 4)
            </span>
            <ChevronRight className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => navigate('/kitchen')}
            className="w-full py-4 px-6 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/5 flex items-center justify-between transition-all"
          >
            <span>Kitchen Dashboard Monitor</span>
            <ChevronRight className="w-5 h-5" />
          </button>

          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full py-4 px-6 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/5 flex items-center justify-between transition-all"
          >
            <span>User Status Dashboard</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-8 text-xs text-restaurant-textMuted border-t border-white/5 pt-4">
          To simulate QR scan, go directly to <span className="text-white">/menu/table_id</span> in the address bar.
        </div>
      </div>
    </div>
  );
}

// Custom event wrapper for SPA navigation
class PopEvent extends Event {
  constructor(type) {
    super(type);
  }
}

// --- CUSTOMER MENU SCREEN ---
function CustomerMenu({ tableId }) {
  const { 
    menu, cart, customerOrders = [], fetchMenu, addToCart, removeFromCart, 
    placeOrder, setTableId, clearPersistedOrder, fetchTableOrders
  } = useStore();

  const [view, setView] = useState('menu');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState({}); // item_id: selectedVariant

  useEffect(() => {
    setTableId(tableId);
    fetchMenu();

    // Fetch orders from database for this table
    fetchTableOrders(tableId).then(() => {
      const orders = useStore.getState().customerOrders || [];
      const hasActive = orders.some(o => o.status !== 'Delivered' || !o.feedback_submitted);
      if (hasActive) {
        setView('tracking');
      }
    });
  }, [tableId]);

  // Group menu categories
  const categories = ['All', ...new Set(menu.map(item => item.category))];
  const filteredMenu = selectedCategory === 'All' 
    ? menu 
    : menu.filter(item => item.category === selectedCategory);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Initialize variants for multi-price items
  const handleVariantChange = (itemId, variant) => {
    setSelectedVariants(prev => ({
      ...prev,
      [itemId]: variant
    }));
  };

  if (view === 'tracking') {
    return <OrderTrackingScreen tableId={tableId} onViewChange={setView} />;
  }

  return (
    <div className="min-h-screen pb-24 text-gray-100 bg-[#0c0c0e]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-white/5 px-4 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-restaurant-accent"></span>
            Table {tableId}
          </h2>
          <p className="text-xs text-restaurant-textMuted">Ready to Order</p>
        </div>
        <div className="flex gap-2">
          {customerOrders.length > 0 && (
            <button 
              onClick={() => setView('tracking')}
              className="relative w-12 h-12 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all text-restaurant-textMuted hover:text-white"
              title="Track Orders"
            >
              <Clock className="w-5 h-5 text-yellow-500" />
              <span className="absolute -top-1.5 -right-1.5 bg-yellow-500 text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0c0c0e]">
                {customerOrders.length}
              </span>
            </button>
          )}
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative w-12 h-12 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all"
          >
            <ShoppingBag className="w-5 h-5 text-restaurant-accent" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-restaurant-accent text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0c0c0e]">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="px-4 py-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-restaurant-accent/20 to-purple-500/10 border border-white/5 p-6 shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-restaurant-accent/10 rounded-full blur-3xl"></div>
          <h1 className="text-2xl font-bold mb-1">Authentic Cuisines</h1>
          <p className="text-sm text-restaurant-textMuted max-w-[70%]">Scan your table QR, select delicious recipes, and get served instantly.</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 overflow-x-auto flex gap-2 pb-4 scrollbar-none sticky top-[80px] z-30 bg-[#0c0c0e]/85 backdrop-blur-lg">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-xl border transition-all ${
              selectedCategory === cat
                ? 'bg-restaurant-accent border-restaurant-accent text-white shadow-lg shadow-restaurant-accent/10'
                : 'bg-white/5 border-white/5 text-restaurant-textMuted hover:text-white hover:bg-white/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="px-4 mt-2 space-y-4">
        {filteredMenu.map(item => {
          const defaultVariant = item.is_multi_price ? Object.keys(item.prices)[0] : null;
          const selectedVariant = selectedVariants[item._id] || defaultVariant;
          const currentPrice = item.is_multi_price ? item.prices[selectedVariant] : item.price;
          
          const inCart = cart.find(c => c.item_id === item._id && c.selected_variant === selectedVariant);

          return (
            <div key={item._id} className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row gap-4 border border-white/5 hover:border-white/10 transition-all animate-slide-in">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded text-restaurant-accent">
                    {item.category}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-white mb-1">{item.name}</h3>
                <p className="text-sm text-restaurant-textMuted line-clamp-2 mb-3">{item.description}</p>
                
                {/* Variant selection for multi-price items */}
                {item.is_multi_price && (
                  <div className="flex items-center gap-2 mb-4 bg-white/5 p-1 rounded-lg w-max">
                    {Object.keys(item.prices).map(v => (
                      <button
                        key={v}
                        onClick={() => handleVariantChange(item._id, v)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
                          selectedVariant === v
                            ? 'bg-restaurant-accent text-white shadow'
                            : 'text-restaurant-textMuted hover:text-white'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xl font-extrabold text-white">
                    ₹{currentPrice}
                  </span>
                  
                  {inCart ? (
                    <div className="flex items-center gap-3 bg-restaurant-accent text-white px-3 py-1.5 rounded-xl">
                      <button onClick={() => removeFromCart(item._id, selectedVariant)}>
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-bold text-sm w-4 text-center">{inCart.quantity}</span>
                      <button onClick={() => addToCart(item, selectedVariant)}>
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(item, selectedVariant)}
                      className="px-4 py-2 bg-restaurant-accent hover:bg-restaurant-accentHover text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Bar */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 bg-restaurant-accent/95 hover:bg-restaurant-accent/100 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between shadow-2xl transition-all animate-pulse-ring cursor-pointer"
             onClick={() => setIsCartOpen(true)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/80">{cartItemCount} Items Added</p>
              <h4 className="font-bold text-white text-lg">₹{cartTotal}</h4>
            </div>
          </div>
          <span className="flex items-center gap-1 font-bold text-white text-sm">
            View Cart <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      )}

      {/* Cart Drawer Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md h-full bg-[#0c0c0e] border-l border-white/5 flex flex-col p-6 animate-slide-in">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-restaurant-accent" />
                Your Order
              </h3>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="text-restaurant-textMuted hover:text-white"
              >
                Close
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <ShoppingBag className="w-12 h-12 text-restaurant-textMuted/50 mb-4" />
                <p className="text-restaurant-textMuted">Your cart is empty.</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {cart.map(cartItem => (
                    <div key={cartItem.item_id + (cartItem.selected_variant || '')} className="glass-panel p-4 rounded-xl flex items-center justify-between border border-white/5">
                      <div>
                        <h4 className="font-bold text-sm">{cartItem.name}</h4>
                        {cartItem.selected_variant && (
                          <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-restaurant-textMuted">
                            {cartItem.selected_variant}
                          </span>
                        )}
                        <p className="text-xs text-restaurant-accent mt-1">₹{cartItem.price} each</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-lg">
                          <button onClick={() => removeFromCart(cartItem.item_id, cartItem.selected_variant)}>
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-bold text-xs">{cartItem.quantity}</span>
                          <button onClick={() => {
                            const menuItem = menu.find(m => m._id === cartItem.item_id);
                            addToCart(menuItem, cartItem.selected_variant);
                          }}>
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/5 pt-6 mt-6 space-y-4">
                  <div className="flex justify-between items-center text-restaurant-textMuted text-sm">
                    <span>Subtotal</span>
                    <span>₹{cartTotal}</span>
                  </div>
                  <div className="flex justify-between items-center text-white font-bold text-lg">
                    <span>Total Amount</span>
                    <span>₹{cartTotal}</span>
                  </div>
                  <button
                    onClick={async () => {
                      const res = await placeOrder();
                      if (res) {
                        setIsCartOpen(false);
                        setView('tracking');
                      }
                    }}
                    className="w-full py-4 bg-restaurant-accent hover:bg-restaurant-accentHover text-white font-bold rounded-xl transition-all shadow-lg shadow-restaurant-accent/10"
                  >
                    Confirm & Send to Kitchen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- ORDER TRACKING & FEEDBACK SCREEN ---
function OrderTrackingScreen({ tableId, onViewChange }) {
  const { customerOrders = [], submitFeedback, clearPersistedOrder } = useStore();

  // If there are no customer orders, return to menu
  useEffect(() => {
    if (customerOrders.length === 0) {
      onViewChange('menu');
    }
  }, [customerOrders, onViewChange]);

  if (customerOrders.length === 0) return null;

  return (
    <div className="min-h-screen text-gray-100 bg-[#0c0c0e] p-4 flex flex-col items-center pb-24">
      <div className="max-w-md w-full flex flex-col gap-4">
        {/* Navigation/Header Bar */}
        <div className="flex items-center justify-start mb-2">
          <button
            onClick={() => onViewChange('menu')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-xl transition-all border border-white/5 text-gray-300 hover:text-white"
          >
            ← Back to Menu / Order More
          </button>
        </div>

        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold tracking-tight">Track Your Orders</h1>
          <p className="text-xs text-restaurant-textMuted mt-1">Table {tableId} • {customerOrders.length} Order(s) placed</p>
        </div>

        {/* List of Orders in Reverse Order (latest first) */}
        {[...customerOrders].reverse().map((order) => (
          <OrderCard key={order._id} order={order} submitFeedback={submitFeedback} />
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order, submitFeedback }) {
  const [waiterRating, setWaiterRating] = useState(5);
  const [itemRatings, setItemRatings] = useState({});
  const [overallComments, setOverallComments] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [isExpanded, setIsExpanded] = useState(order.status !== 'Delivered' || !order.feedback_submitted);

  useEffect(() => {
    if (order && order.items) {
      const initial = {};
      order.items.forEach(item => {
        initial[item.item_id] = { rating: 5, comments: '' };
      });
      setItemRatings(initial);
    }
  }, [order]);

  const isPreparing = order.status === 'Preparing';
  const isReady = order.status === 'Ready for Delivery';
  const isDelivered = order.status === 'Delivered';

  const handleItemRatingChange = (itemId, val) => {
    setItemRatings(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], rating: val }
    }));
  };

  const handleItemCommentsChange = (itemId, val) => {
    setItemRatings(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], comments: val }
    }));
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    const itemFeedbacks = Object.keys(itemRatings).map(itemId => ({
      item_id: itemId,
      name: order.items.find(i => i.item_id === itemId)?.name || '',
      rating: itemRatings[itemId].rating,
      comments: itemRatings[itemId].comments
    }));

    const success = await submitFeedback(order._id, waiterRating, itemFeedbacks, overallComments);
    if (success) {
      setFeedbackSuccess(true);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-5 border border-white/5 relative overflow-hidden shadow-xl transition-all hover:border-white/10">
      {/* Top Title Section */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <Clock className={`w-5 h-5 ${isDelivered ? 'text-green-500' : 'text-restaurant-accent'}`} />
          <div>
            <h3 className="font-bold text-sm">Order #{order._id.slice(-6)}</h3>
            <p className="text-[10px] text-restaurant-textMuted">
              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
            isDelivered 
              ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
              : 'bg-restaurant-accent/10 text-restaurant-accent border border-restaurant-accent/20'
          }`}>
            {order.status}
          </span>
          <span className="text-restaurant-textMuted text-xs">
            {isExpanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-5 space-y-4 animate-slide-in">
          {/* Live Status Tracker */}
          <div className="space-y-4 mb-4 border-b border-white/5 pb-4">
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border font-bold text-[10px] ${
                isPreparing || isReady || isDelivered 
                  ? 'bg-restaurant-accent border-restaurant-accent text-white'
                  : 'border-white/10 text-restaurant-textMuted'
              }`}>
                1
              </div>
              <div className="flex-1">
                <h4 className={`font-semibold text-xs ${isPreparing ? 'text-white' : 'text-restaurant-textMuted'}`}>Preparing</h4>
                <p className="text-[10px] text-restaurant-textMuted">Chef is crafting your fresh order.</p>
              </div>
              {isPreparing && <span className="w-2 h-2 rounded-full bg-restaurant-accent animate-ping mt-1"></span>}
            </div>

            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border font-bold text-[10px] ${
                isReady || isDelivered
                  ? 'bg-restaurant-accent border-restaurant-accent text-white'
                  : 'border-white/10 text-restaurant-textMuted'
              }`}>
                2
              </div>
              <div className="flex-1">
                <h4 className={`font-semibold text-xs ${isReady ? 'text-white' : 'text-restaurant-textMuted'}`}>Ready for Delivery</h4>
                <p className="text-[10px] text-restaurant-textMuted">Waitstaff is picking up your order.</p>
              </div>
              {isReady && <span className="w-2 h-2 rounded-full bg-restaurant-accent animate-ping mt-1"></span>}
            </div>

            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border font-bold text-[10px] ${
                isDelivered
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-white/10 text-restaurant-textMuted'
              }`}>
                3
              </div>
              <div className="flex-1">
                <h4 className={`font-semibold text-xs ${isDelivered ? 'text-green-500' : 'text-restaurant-textMuted'}`}>Delivered</h4>
                <p className="text-[10px] text-restaurant-textMuted">Enjoy your hot meal!</p>
              </div>
            </div>
          </div>

          {/* Order Details list */}
          <div className="mb-4">
            <h4 className="font-bold text-[10px] text-restaurant-textMuted uppercase tracking-wider mb-2">Items</h4>
            <div className="space-y-2">
              {order.items.map(item => (
                <div key={item.item_id + (item.selected_variant || '')} className="flex justify-between items-center text-xs bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <div>
                    <span className="font-bold">{item.name}</span>
                    {item.selected_variant && (
                      <span className="text-[9px] bg-white/10 text-restaurant-textMuted px-1.5 py-0.5 rounded ml-2">
                        {item.selected_variant}
                      </span>
                    )}
                  </div>
                  <span className="text-restaurant-textMuted font-medium">x{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback Section (Delivered state) */}
          {isDelivered && (
            <div className="mt-4 border-t border-white/5 pt-4">
              {feedbackSuccess || order.feedback_submitted ? (
                <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                  <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <h4 className="font-bold text-sm mb-1">Feedback Submitted</h4>
                  <p className="text-[10px] text-restaurant-textMuted">Thank you for rating this order!</p>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <Award className="w-4 h-4 text-restaurant-accent" />
                    <h3 className="text-sm font-bold">Rate this Order</h3>
                  </div>

                  {/* Waiter Rating */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-restaurant-textMuted">Rate your Waiter</label>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setWaiterRating(star)}
                          className="text-yellow-500 hover:scale-110 transition-all"
                        >
                          <Star className={`w-6 h-6 ${star <= waiterRating ? 'fill-yellow-500' : 'text-gray-600'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Items Rating */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-semibold text-restaurant-textMuted block">Rate individual Dishes</label>
                    {order.items.map(item => (
                      <div key={item.item_id} className="bg-white/5 p-3 rounded-xl space-y-2 border border-white/5">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-xs">{item.name}</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                type="button"
                                key={star}
                                onClick={() => handleItemRatingChange(item.item_id, star)}
                                className="text-yellow-500 hover:scale-115 transition-all"
                              >
                                <Star className={`w-4 h-4 ${star <= (itemRatings[item.item_id]?.rating || 5) ? 'fill-yellow-500' : 'text-gray-600'}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          type="text"
                          placeholder="Add comments (optional)"
                          value={itemRatings[item.item_id]?.comments || ''}
                          onChange={(e) => handleItemCommentsChange(item.item_id, e.target.value)}
                          className="w-full bg-white/5 border border-white/5 text-[10px] p-2 rounded-lg text-white focus:outline-none focus:border-restaurant-accent"
                        />
                      </div>
                    ))}
                  </div>

                  {/* General Comments */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-restaurant-textMuted block">Overall Comments</label>
                    <textarea
                      rows="2"
                      value={overallComments}
                      onChange={(e) => setOverallComments(e.target.value)}
                      placeholder="Share your experience..."
                      className="w-full bg-white/5 border border-white/5 text-xs p-2 rounded-xl text-white focus:outline-none focus:border-restaurant-accent"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-restaurant-accent hover:bg-restaurant-accentHover text-white font-bold rounded-xl text-xs transition-all shadow-lg"
                  >
                    Submit Feedback
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- KITCHEN MONITOR DASHBOARD ---
function KitchenDashboard() {
  const { activeOrders, fetchActiveOrders, updateOrderStatus, fetchAllOrders } = useStore();
  const [soundTested, setSoundTested] = useState(false);
  const [viewMode, setViewMode] = useState('rows'); // 'rows' or 'columns'

  useEffect(() => {
    fetchActiveOrders();
    fetchAllOrders();
  }, []);

  const triggerAudioTest = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav');
      audio.play();
      setSoundTested(true);
    } catch(e) {
      console.error(e);
    }
  };

  const preparingOrders = activeOrders.filter(o => o.status === 'Preparing');
  const readyOrders = activeOrders.filter(o => o.status === 'Ready for Delivery');

  const getMinutesElapsed = (createdAtString) => {
    const created = new Date(createdAtString);
    const diffMs = Math.abs(new Date() - created);
    return Math.floor(diffMs / (1000 * 60));
  };

  return (
    <div className="min-h-screen text-gray-100 bg-[#070709] p-6">
      {/* Top Header stats dashboard */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 bg-[#0c0c0e] border border-white/5 p-6 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-3">
          <ChefHat className="w-8 h-8 text-restaurant-accent animate-bounce" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Kitchen Monitor
              <span className="text-[10px] font-bold uppercase tracking-widest bg-restaurant-accent/20 text-restaurant-accent px-2 py-0.5 rounded-full border border-restaurant-accent/30 animate-pulse">
                Live Board
              </span>
            </h1>
            <p className="text-xs text-restaurant-textMuted">Real-time incoming orders & status board</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* View Toggle */}
          <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setViewMode('rows')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'rows'
                  ? 'bg-restaurant-accent text-white shadow-md'
                  : 'text-restaurant-textMuted hover:text-white'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" /> Row View
            </button>
            <button
              onClick={() => setViewMode('columns')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'columns'
                  ? 'bg-restaurant-accent text-white shadow-md'
                  : 'text-restaurant-textMuted hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Column View
            </button>
          </div>

          <div className="flex gap-3">
            <div className="text-center bg-white/5 border border-white/5 px-4 py-1.5 rounded-xl">
              <span className="text-[10px] text-restaurant-textMuted block uppercase font-bold tracking-wider">Preparing</span>
              <span className="text-lg font-extrabold text-yellow-500">{preparingOrders.length}</span>
            </div>
            <div className="text-center bg-white/5 border border-white/5 px-4 py-1.5 rounded-xl">
              <span className="text-[10px] text-restaurant-textMuted block uppercase font-bold tracking-wider">Ready</span>
              <span className="text-lg font-extrabold text-restaurant-accent">{readyOrders.length}</span>
            </div>
          </div>

          <button
            onClick={triggerAudioTest}
            className={`px-3.5 py-2 border rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              soundTested 
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-white/5 border-white/5 text-restaurant-textMuted hover:bg-white/10'
            }`}
          >
            <Play className="w-3.5 h-3.5" /> {soundTested ? 'Sound Tested' : 'Test Audio Alert'}
          </button>
        </div>
      </header>

      {/* DASHBOARD CONTENT */}
      {viewMode === 'rows' ? (
        /* ROW BY ROW LAYOUT */
        <div className="space-y-8 max-w-6xl mx-auto">
          {/* SECTION 1: PREPARING ORDERS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                </span>
                <h2 className="text-lg font-bold text-white">1. Preparing Orders ({preparingOrders.length})</h2>
              </div>
              <span className="text-xs text-yellow-500/80 font-medium">Currently Cooking</span>
            </div>

            {preparingOrders.length === 0 ? (
              <div className="p-8 text-center glass-panel rounded-2xl text-restaurant-textMuted text-sm border border-white/5">
                No orders currently preparing.
              </div>
            ) : (
              <div className="space-y-4">
                {preparingOrders.map((order, idx) => {
                  const mins = getMinutesElapsed(order.created_at);
                  return (
                    <div 
                      key={order._id}
                      style={{ animationDelay: `${idx * 0.08}s` }}
                      className="glass-panel border-l-4 border-l-yellow-500 auto-glow-preparing rounded-2xl p-5 md:p-6 border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-cascade"
                    >
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xl font-extrabold text-white">
                            Table {order.table_id.replace('table_', '')}
                          </span>
                          <span className="text-xs font-extrabold bg-yellow-500/10 text-yellow-400 px-3 py-1 rounded-full border border-yellow-500/20 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-beacon"></span>
                            Order #{order._id.slice(-6)}
                          </span>
                          <span className="text-xs text-restaurant-textMuted flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                            <Clock className="w-3.5 h-3.5 text-yellow-500 animate-spin-slow" /> {mins}m ago
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          {order.items.map((item, i) => (
                            <span key={i} className="text-xs font-semibold bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-1.5">
                              <span className="text-restaurant-accent font-bold">{item.quantity}x</span> 
                              <span className="text-gray-200">{item.name}</span>
                              {item.selected_variant && (
                                <span className="text-[10px] text-restaurant-textMuted bg-white/10 px-1.5 py-0.5 rounded">
                                  {item.selected_variant}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => updateOrderStatus(order._id, 'Ready for Delivery')}
                        className="w-full md:w-auto px-6 py-3.5 bg-restaurant-accent hover:bg-restaurant-accentHover text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-restaurant-accent/20 hover:scale-105 active:scale-95"
                      >
                        <Check className="w-4 h-4" /> Mark as Cooked
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: READY FOR DELIVERY ORDERS */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-restaurant-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-restaurant-accent"></span>
                </span>
                <h2 className="text-lg font-bold text-white">2. Ready for Delivery ({readyOrders.length})</h2>
              </div>
              <span className="text-xs text-restaurant-accent font-medium">Awaiting Pickup</span>
            </div>

            {readyOrders.length === 0 ? (
              <div className="p-8 text-center glass-panel rounded-2xl text-restaurant-textMuted text-sm border border-white/5">
                No orders waiting for delivery.
              </div>
            ) : (
              <div className="space-y-4">
                {readyOrders.map((order, idx) => {
                  const mins = getMinutesElapsed(order.created_at);
                  return (
                    <div 
                      key={order._id}
                      style={{ animationDelay: `${idx * 0.08}s` }}
                      className="glass-panel border-l-4 border-l-restaurant-accent auto-glow-ready rounded-2xl p-5 md:p-6 border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-cascade"
                    >
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xl font-extrabold text-white">
                            Table {order.table_id.replace('table_', '')}
                          </span>
                          <span className="text-xs font-extrabold bg-restaurant-accent/15 text-restaurant-accent px-3 py-1 rounded-full border border-restaurant-accent/30 flex items-center gap-1.5 animate-radar">
                            <Sparkles className="w-3.5 h-3.5 text-restaurant-accent" />
                            Order #{order._id.slice(-6)}
                          </span>
                          <span className="text-xs text-restaurant-textMuted flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                            <Clock className="w-3.5 h-3.5 text-restaurant-accent" /> {mins}m ago
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          {order.items.map((item, i) => (
                            <span key={i} className="text-xs font-semibold bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-1.5">
                              <span className="text-green-400 font-bold">{item.quantity}x</span> 
                              <span className="text-gray-200">{item.name}</span>
                              {item.selected_variant && (
                                <span className="text-[10px] text-restaurant-textMuted bg-white/10 px-1.5 py-0.5 rounded">
                                  {item.selected_variant}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => updateOrderStatus(order._id, 'Delivered')}
                        className="w-full md:w-auto px-6 py-3.5 bg-green-500 hover:bg-green-600 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-green-500/20 hover:scale-105 active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Mark as Delivered
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* COLUMN BOARD LAYOUT */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* COLUMN 1: PREPARING */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <span className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></span>
              <h2 className="text-lg font-bold">1. Preparing ({preparingOrders.length})</h2>
            </div>

            <div className="space-y-4">
              {preparingOrders.length === 0 ? (
                <div className="p-8 text-center glass-panel rounded-2xl text-restaurant-textMuted text-sm">
                  No orders currently preparing.
                </div>
              ) : (
                preparingOrders.map(order => {
                  const mins = getMinutesElapsed(order.created_at);
                  return (
                    <div key={order._id} className="glass-panel border-l-4 border-l-yellow-500 auto-glow-preparing rounded-2xl p-5 border border-white/5 flex flex-col justify-between gap-4 animate-cascade">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-extrabold text-white">Table {order.table_id.replace('table_', '')}</span>
                          <span className="text-[10px] font-bold bg-yellow-500/10 px-2.5 py-1 rounded text-yellow-400 border border-yellow-500/20">
                            #{order._id.slice(-6)}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="text-sm font-medium">
                              <span className="text-restaurant-accent font-bold">{item.quantity}x</span> {item.name}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5 text-xs text-restaurant-textMuted">
                          <Clock className="w-3.5 h-3.5 text-yellow-500" /> {mins}m ago
                        </div>
                        <button
                          onClick={() => updateOrderStatus(order._id, 'Ready for Delivery')}
                          className="px-4 py-2 bg-restaurant-accent hover:bg-restaurant-accentHover text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow"
                        >
                          <Check className="w-4 h-4" /> Cooked
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUMN 2: READY FOR DELIVERY */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <span className="w-3 h-3 rounded-full bg-restaurant-accent animate-ping"></span>
              <h2 className="text-lg font-bold">2. Ready for Delivery ({readyOrders.length})</h2>
            </div>

            <div className="space-y-4">
              {readyOrders.length === 0 ? (
                <div className="p-8 text-center glass-panel rounded-2xl text-restaurant-textMuted text-sm">
                  No orders waiting for delivery.
                </div>
              ) : (
                readyOrders.map(order => {
                  const mins = getMinutesElapsed(order.created_at);
                  return (
                    <div key={order._id} className="glass-panel border-l-4 border-l-restaurant-accent auto-glow-ready rounded-2xl p-5 border border-white/5 flex flex-col justify-between gap-4 animate-cascade">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-extrabold text-white">Table {order.table_id.replace('table_', '')}</span>
                          <span className="text-[10px] font-bold bg-restaurant-accent/10 px-2.5 py-1 rounded text-restaurant-accent border border-restaurant-accent/20">
                            #{order._id.slice(-6)}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="text-sm font-medium">
                              <span className="text-green-400 font-bold">{item.quantity}x</span> {item.name}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5 text-xs text-restaurant-textMuted">
                          <Clock className="w-3.5 h-3.5 text-restaurant-accent" /> {mins}m ago
                        </div>
                        <button
                          onClick={() => updateOrderStatus(order._id, 'Delivered')}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Delivered
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- USER STATUS DASHBOARD PAGE ---
function UserDashboard() {
  const { allOrders = [], fetchAllOrders } = useStore();
  const [viewMode, setViewMode] = useState('rows'); // 'rows' (default row-by-row) or 'grid'
  
  useEffect(() => {
    fetchAllOrders();
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopEvent('popstate'));
  };

  const preparingOrders = allOrders.filter(o => o.status === 'Preparing');
  const readyOrders = allOrders.filter(o => o.status === 'Ready for Delivery');
  const deliveredOrders = allOrders.filter(o => o.status === 'Delivered');

  return (
    <div className="min-h-screen text-gray-100 bg-[#070709] p-4 md:p-8 flex flex-col items-center">
      <div className="max-w-5xl w-full flex flex-col gap-6">
        
        {/* Navigation/Header Bar */}
        <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-[#0c0c0e] border border-white/5 p-6 rounded-3xl w-full shadow-2xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-xl transition-all border border-white/5 text-gray-300 hover:text-white"
            >
              ← Back to Home
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                User Dashboard
                <span className="w-2 h-2 rounded-full bg-green-500 animate-beacon"></span>
              </h1>
              <p className="text-xs text-restaurant-textMuted">Real-time Row-by-Row Order Tracker</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
            {/* View Switcher Toggle */}
            <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setViewMode('rows')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'rows'
                    ? 'bg-restaurant-accent text-white shadow-lg shadow-restaurant-accent/20'
                    : 'text-restaurant-textMuted hover:text-white'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" /> Row View
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'grid'
                    ? 'bg-restaurant-accent text-white shadow-lg shadow-restaurant-accent/20'
                    : 'text-restaurant-textMuted hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Grid View
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-center bg-white/5 border border-white/5 px-3.5 py-1.5 rounded-xl min-w-[65px]">
                <span className="text-[9px] text-restaurant-textMuted block uppercase font-bold tracking-wider">Preparing</span>
                <span className="text-base font-extrabold text-yellow-500">{preparingOrders.length}</span>
              </div>
              <div className="text-center bg-white/5 border border-white/5 px-3.5 py-1.5 rounded-xl min-w-[65px]">
                <span className="text-[9px] text-restaurant-textMuted block uppercase font-bold tracking-wider">Ready</span>
                <span className="text-base font-extrabold text-restaurant-accent">{readyOrders.length}</span>
              </div>
              <div className="text-center bg-white/5 border border-white/5 px-3.5 py-1.5 rounded-xl min-w-[65px]">
                <span className="text-[9px] text-restaurant-textMuted block uppercase font-bold tracking-wider">Delivered</span>
                <span className="text-base font-extrabold text-green-500">{deliveredOrders.length}</span>
              </div>
            </div>
          </div>
        </header>

        {/* ORDER CARDS DISPLAY */}
        {allOrders.length === 0 ? (
          <div className="p-12 text-center glass-panel rounded-3xl text-restaurant-textMuted text-sm border border-white/5">
            No orders placed in the system yet.
          </div>
        ) : viewMode === 'rows' ? (
          /* ROW BY ROW LAYOUT */
          <div className="flex flex-col gap-4 w-full">
            {allOrders.map((order, idx) => {
              const isPreparing = order.status === 'Preparing';
              const isReady = order.status === 'Ready for Delivery';
              const isDelivered = order.status === 'Delivered';

              const glowClass = 
                isPreparing ? 'auto-glow-preparing border-l-4 border-l-yellow-500' :
                isReady ? 'auto-glow-ready border-l-4 border-l-restaurant-accent' :
                'auto-glow-delivered border-l-4 border-l-green-500';

              const statusBadgeStyle = 
                isDelivered ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                isReady ? 'bg-restaurant-accent/15 text-restaurant-accent border-restaurant-accent/30 animate-pulse-ring' :
                'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';

              return (
                <div 
                  key={order._id}
                  style={{ animationDelay: `${idx * 0.06}s` }}
                  className={`glass-panel p-5 md:p-6 rounded-2xl border border-white/5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 transition-all duration-300 hover:scale-[1.01] bg-[#0c0c0e]/90 animate-cascade ${glowClass}`}
                >
                  {/* LEFT DETAILS COLUMN */}
                  <div className="flex flex-col gap-2 min-w-[220px]">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg font-extrabold text-white">Order #{order._id.slice(-6)}</span>
                      <span className="text-[11px] font-extrabold bg-white/10 text-restaurant-accent px-2.5 py-0.5 rounded-lg border border-white/10">
                        Table {order.table_id.replace('table_', '')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-restaurant-textMuted">
                      <Clock className="w-3.5 h-3.5 text-restaurant-accent" />
                      <span>Placed at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Order items tag preview */}
                    {order.items && order.items.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {order.items.map((item, itemIdx) => (
                          <span key={itemIdx} className="text-[11px] font-medium bg-white/5 text-gray-300 px-2 py-0.5 rounded-md border border-white/5">
                            <span className="text-restaurant-accent font-bold">{item.quantity}x</span> {item.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* CENTER STEP TRACKER TIMELINE */}
                  <div className="flex-1 w-full max-w-md bg-white/[0.02] border border-white/5 rounded-xl p-3">
                    <div className="flex items-center justify-between relative px-2">
                      {/* Connecting animated line */}
                      <div className="absolute top-1/2 left-6 right-6 h-1 bg-white/10 -translate-y-1/2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isDelivered ? 'w-full bg-green-500' :
                            isReady ? 'w-2/3 bg-restaurant-accent animate-shimmer-bar' :
                            'w-1/3 bg-yellow-500'
                          }`}
                        ></div>
                      </div>

                      {/* Step 1: Placed */}
                      <div className="relative z-10 flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-restaurant-accent border-2 border-[#0c0c0e] flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                          ✓
                        </div>
                        <span className="text-[10px] font-medium text-gray-300">Placed</span>
                      </div>

                      {/* Step 2: Preparing */}
                      <div className="relative z-10 flex flex-col items-center gap-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                          isPreparing || isReady || isDelivered 
                            ? 'bg-yellow-500 text-black border-2 border-[#0c0c0e] shadow-md shadow-yellow-500/30' 
                            : 'bg-white/10 text-gray-400 border border-white/10'
                        }`}>
                          {isPreparing ? <Utensils className="w-3.5 h-3.5 animate-spin-slow" /> : '✓'}
                        </div>
                        <span className={`text-[10px] font-medium ${isPreparing ? 'text-yellow-400 font-bold' : 'text-gray-400'}`}>
                          Preparing
                        </span>
                      </div>

                      {/* Step 3: Ready */}
                      <div className="relative z-10 flex flex-col items-center gap-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                          isReady || isDelivered 
                            ? 'bg-restaurant-accent text-white border-2 border-[#0c0c0e] shadow-md shadow-restaurant-accent/30 animate-radar' 
                            : 'bg-white/10 text-gray-400 border border-white/10'
                        }`}>
                          {isReady ? <Sparkles className="w-3.5 h-3.5" /> : isDelivered ? '✓' : '3'}
                        </div>
                        <span className={`text-[10px] font-medium ${isReady ? 'text-restaurant-accent font-bold' : 'text-gray-400'}`}>
                          Ready
                        </span>
                      </div>

                      {/* Step 4: Delivered */}
                      <div className="relative z-10 flex flex-col items-center gap-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                          isDelivered 
                            ? 'bg-green-500 text-white border-2 border-[#0c0c0e] shadow-md shadow-green-500/30' 
                            : 'bg-white/10 text-gray-400 border border-white/10'
                        }`}>
                          {isDelivered ? <CheckCircle2 className="w-4 h-4" /> : '4'}
                        </div>
                        <span className={`text-[10px] font-medium ${isDelivered ? 'text-green-400 font-bold' : 'text-gray-400'}`}>
                          Delivered
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT STATUS & TOTAL COLUMN */}
                  <div className="flex lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
                    <span className="text-sm font-extrabold text-white">
                      Total: <span className="text-restaurant-accent">₹{order.total_amount}</span>
                    </span>

                    <span className={`text-[11px] font-extrabold px-3.5 py-1.5 rounded-full uppercase border tracking-wider flex items-center gap-1.5 shadow-sm ${statusBadgeStyle}`}>
                      <span className={`w-2 h-2 rounded-full ${isDelivered ? 'bg-green-400' : isReady ? 'bg-restaurant-accent animate-beacon' : 'bg-yellow-400 animate-beacon'}`}></span>
                      {order.status === 'Ready for Delivery' ? 'READY' : order.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* GRID LAYOUT OPTION */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {allOrders.map((order, idx) => {
              const isPreparing = order.status === 'Preparing';
              const isReady = order.status === 'Ready for Delivery';
              const isDelivered = order.status === 'Delivered';

              const glowClass = 
                isPreparing ? 'auto-glow-preparing border-yellow-500/40' :
                isReady ? 'auto-glow-ready border-restaurant-accent/40' :
                'auto-glow-delivered border-green-500/30';

              const statusColor = 
                isDelivered ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                isReady ? 'bg-restaurant-accent/15 text-restaurant-accent border-restaurant-accent/30 animate-pulse-ring' :
                'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';

              return (
                <div 
                  key={order._id} 
                  style={{ animationDelay: `${idx * 0.06}s` }}
                  className={`glass-panel p-6 rounded-3xl border flex flex-col justify-between gap-6 transition-all duration-300 hover:scale-[1.02] bg-[#0c0c0e]/90 animate-cascade ${glowClass}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="text-base font-extrabold text-white">Order #{order._id.slice(-6)}</h3>
                      <p className="text-[11px] text-restaurant-textMuted mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-restaurant-accent" />
                        Placed at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="text-[11px] font-extrabold bg-restaurant-accent/10 text-restaurant-accent px-2.5 py-1 rounded-lg border border-restaurant-accent/15">
                      Table {order.table_id.replace('table_', '')}
                    </span>
                  </div>

                  {order.items && order.items.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {order.items.map((item, itemIdx) => (
                        <span key={itemIdx} className="text-[11px] font-medium bg-white/5 text-gray-300 px-2 py-0.5 rounded-md border border-white/5">
                          <span className="text-restaurant-accent font-bold">{item.quantity}x</span> {item.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <span className="text-xs text-white font-extrabold">Total: ₹{order.total_amount}</span>
                    <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase border tracking-wider flex items-center gap-1.5 ${statusColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isDelivered ? 'bg-green-400' : isReady ? 'bg-restaurant-accent animate-beacon' : 'bg-yellow-400 animate-beacon'}`}></span>
                      {order.status === 'Ready for Delivery' ? 'READY' : order.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

