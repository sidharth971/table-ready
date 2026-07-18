import React, { useEffect, useState } from 'react';
import { useStore } from './store';
import { 
  ShoppingBag, Check, Star, Clock, Bell, Trash2, 
  Plus, Minus, ChevronRight, CheckCircle2, Play, Award, ClipboardList
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
    menu, cart, customerOrder, fetchMenu, addToCart, removeFromCart, 
    placeOrder, setTableId, clearPersistedOrder 
  } = useStore();

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState({}); // item_id: selectedVariant

  useEffect(() => {
    setTableId(tableId);
    fetchMenu();
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

  if (customerOrder) {
    return <OrderTrackingScreen tableId={tableId} />;
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
                      if (res) setIsCartOpen(false);
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
function OrderTrackingScreen({ tableId }) {
  const { customerOrder, updateOrderStatus, submitFeedback, clearPersistedOrder } = useStore();
  const [waiterRating, setWaiterRating] = useState(5);
  const [itemRatings, setItemRatings] = useState({}); // item_id: { rating: 5, comments: '' }
  const [overallComments, setOverallComments] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  useEffect(() => {
    // Initialize item ratings
    if (customerOrder && customerOrder.items) {
      const initial = {};
      customerOrder.items.forEach(item => {
        initial[item.item_id] = { rating: 5, comments: '' };
      });
      setItemRatings(initial);
    }
  }, [customerOrder]);

  if (!customerOrder) return null;

  const isPreparing = customerOrder.status === 'Preparing';
  const isReady = customerOrder.status === 'Ready for Delivery';
  const isDelivered = customerOrder.status === 'Delivered';

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
      name: customerOrder.items.find(i => i.item_id === itemId)?.name || '',
      rating: itemRatings[itemId].rating,
      comments: itemRatings[itemId].comments
    }));

    const success = await submitFeedback(waiterRating, itemFeedbacks, overallComments);
    if (success) {
      setFeedbackSuccess(true);
    }
  };

  return (
    <div className="min-h-screen text-gray-100 bg-[#0c0c0e] p-6 flex flex-col items-center">
      <div className="max-w-md w-full glass-panel rounded-3xl p-6 border border-white/5 relative overflow-hidden shadow-2xl">
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <Clock className="w-5 h-5 text-restaurant-accent" />
          Track Order
        </h2>
        <p className="text-xs text-restaurant-textMuted mb-6">Table {tableId} • Order ID: #{customerOrder._id.slice(-6)}</p>

        {/* Live Status Tracker */}
        <div className="space-y-6 mb-8 border-b border-white/5 pb-6">
          <div className="flex items-start gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-bold text-xs ${
              isPreparing || isReady || isDelivered 
                ? 'bg-restaurant-accent border-restaurant-accent text-white shadow-lg shadow-restaurant-accent/15'
                : 'border-white/10 text-restaurant-textMuted'
            }`}>
              1
            </div>
            <div className="flex-1">
              <h4 className={`font-bold text-sm ${isPreparing ? 'text-white' : 'text-restaurant-textMuted'}`}>Preparing</h4>
              <p className="text-xs text-restaurant-textMuted">Chef is crafting your fresh order.</p>
            </div>
            {isPreparing && <span className="w-2.5 h-2.5 rounded-full bg-restaurant-accent animate-ping mt-1.5"></span>}
          </div>

          <div className="flex items-start gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-bold text-xs ${
              isReady || isDelivered
                ? 'bg-restaurant-accent border-restaurant-accent text-white shadow-lg shadow-restaurant-accent/15'
                : 'border-white/10 text-restaurant-textMuted'
            }`}>
              2
            </div>
            <div className="flex-1">
              <h4 className={`font-bold text-sm ${isReady ? 'text-white' : 'text-restaurant-textMuted'}`}>Ready for Delivery</h4>
              <p className="text-xs text-restaurant-textMuted">Waitstaff is picking up your order.</p>
            </div>
            {isReady && <span className="w-2.5 h-2.5 rounded-full bg-restaurant-accent animate-ping mt-1.5"></span>}
          </div>

          <div className="flex items-start gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-bold text-xs ${
              isDelivered
                ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/15'
                : 'border-white/10 text-restaurant-textMuted'
            }`}>
              3
            </div>
            <div className="flex-1">
              <h4 className={`font-bold text-sm ${isDelivered ? 'text-green-500' : 'text-restaurant-textMuted'}`}>Delivered</h4>
              <p className="text-xs text-restaurant-textMuted">Enjoy your hot meal!</p>
            </div>
          </div>
        </div>

        {/* Order Details list */}
        <div className="mb-6">
          <h4 className="font-bold text-xs text-restaurant-textMuted uppercase tracking-wider mb-3">Your Items</h4>
          <div className="space-y-3">
            {customerOrder.items.map(item => (
              <div key={item.item_id + (item.selected_variant || '')} className="flex justify-between items-center text-sm bg-white/5 p-3 rounded-xl">
                <div>
                  <span className="font-bold">{item.name}</span>
                  {item.selected_variant && (
                    <span className="text-[10px] bg-white/10 text-restaurant-textMuted px-1.5 py-0.5 rounded ml-2">
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
          <div className="mt-8 border-t border-white/5 pt-6">
            {feedbackSuccess || customerOrder.feedback_submitted ? (
              <div className="text-center p-6 bg-green-500/10 border border-green-500/20 rounded-2xl">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h4 className="font-bold text-lg mb-1">Thank You!</h4>
                <p className="text-sm text-restaurant-textMuted mb-6">Your feedback and ratings have been received.</p>
                <button
                  onClick={() => clearPersistedOrder()}
                  className="px-6 py-2.5 bg-white/5 border border-white/5 text-white font-semibold rounded-xl text-sm"
                >
                  Order Something Else
                </button>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <Award className="w-5 h-5 text-restaurant-accent" />
                  <h3 className="text-lg font-bold">Feedback & Rating</h3>
                </div>

                {/* Waiter Rating */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-restaurant-textMuted">Rate your Waiter</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setWaiterRating(star)}
                        className="text-yellow-500 hover:scale-110 transition-all"
                      >
                        <Star className={`w-8 h-8 ${star <= waiterRating ? 'fill-yellow-500' : 'text-gray-600'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Items Rating */}
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-restaurant-textMuted block">Rate individual Dishes</label>
                  {customerOrder.items.map(item => (
                    <div key={item.item_id} className="bg-white/5 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm">{item.name}</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              type="button"
                              key={star}
                              onClick={() => handleItemRatingChange(item.item_id, star)}
                              className="text-yellow-500 hover:scale-115 transition-all"
                            >
                              <Star className={`w-5 h-5 ${star <= (itemRatings[item.item_id]?.rating || 5) ? 'fill-yellow-500' : 'text-gray-600'}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Add comments (optional)"
                        value={itemRatings[item.item_id]?.comments || ''}
                        onChange={(e) => handleItemCommentsChange(item.item_id, e.target.value)}
                        className="w-full bg-white/5 border border-white/5 text-xs p-2 rounded-lg text-white focus:outline-none focus:border-restaurant-accent"
                      />
                    </div>
                  ))}
                </div>

                {/* General Comments */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-restaurant-textMuted block">Overall Comments</label>
                  <textarea
                    rows="3"
                    value={overallComments}
                    onChange={(e) => setOverallComments(e.target.value)}
                    placeholder="Share your experience..."
                    className="w-full bg-white/5 border border-white/5 text-sm p-3 rounded-xl text-white focus:outline-none focus:border-restaurant-accent"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-restaurant-accent hover:bg-restaurant-accentHover text-white font-bold rounded-xl transition-all shadow-lg"
                >
                  Submit Feedback
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- KITCHEN MONITOR DASHBOARD ---
function KitchenDashboard() {
  const { activeOrders, fetchActiveOrders, updateOrderStatus } = useStore();
  const [soundTested, setSoundTested] = useState(false);

  useEffect(() => {
    fetchActiveOrders();
    // Connect WebSocket is already initialized globally on mount
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

  // Group active orders by status
  const preparingOrders = activeOrders.filter(o => o.status === 'Preparing');
  const readyOrders = activeOrders.filter(o => o.status === 'Ready for Delivery');

  // Time elapsed calculator helper
  const getMinutesElapsed = (createdAtString) => {
    const created = new Date(createdAtString);
    const diffMs = Math.abs(new Date() - created);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return diffMins;
  };

  return (
    <div className="min-h-screen text-gray-100 bg-[#070709] p-6">
      {/* Top Header stats dashboard */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 bg-[#0c0c0e] border border-white/5 p-6 rounded-3xl">
        <div>
          <div className="flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-restaurant-accent" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Kitchen Monitor</h1>
              <p className="text-xs text-restaurant-textMuted">Real-time incoming orders & status board</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            <div className="text-center bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
              <span className="text-xs text-restaurant-textMuted block uppercase font-bold tracking-wider">Preparing</span>
              <span className="text-xl font-extrabold text-white">{preparingOrders.length}</span>
            </div>
            <div className="text-center bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
              <span className="text-xs text-restaurant-textMuted block uppercase font-bold tracking-wider">Ready</span>
              <span className="text-xl font-extrabold text-restaurant-accent">{readyOrders.length}</span>
            </div>
          </div>

          <button
            onClick={triggerAudioTest}
            className={`px-4 py-2.5 border rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              soundTested 
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-white/5 border-white/5 text-restaurant-textMuted hover:bg-white/10'
            }`}
          >
            <Play className="w-4 h-4" /> {soundTested ? 'Sound Tested' : 'Test Sound Alert'}
          </button>
        </div>
      </header>

      {/* Two Column Board Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* COLUMN 1: PREPARING (Cooking) */}
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
                  <div key={order._id} className="glass-panel border-l-4 border-l-yellow-500 rounded-2xl p-5 border border-white/5 flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-extrabold text-white">Table {order.table_id}</span>
                        <span className="text-[10px] font-bold bg-white/5 px-2 py-0.5 rounded text-yellow-500 border border-yellow-500/20">
                          #{order._id.slice(-6)}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="text-sm font-medium">
                            <span className="text-restaurant-accent font-bold">{item.quantity}x</span> {item.name}
                            {item.selected_variant && (
                              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-restaurant-textMuted ml-2">
                                {item.selected_variant}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-3 min-w-[120px]">
                      <div className="flex items-center gap-1.5 text-xs text-restaurant-textMuted bg-white/5 px-2 py-1 rounded">
                        <Clock className="w-3.5 h-3.5" /> {mins}m ago
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

        {/* COLUMN 2: READY FOR DELIVERY (Waitstaff pickup) */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
            <span className="w-3 h-3 rounded-full bg-green-500 animate-ping"></span>
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
                  <div key={order._id} className="glass-panel border-l-4 border-l-green-500 rounded-2xl p-5 border border-white/5 flex flex-col md:flex-row justify-between gap-4 animate-pulse-ring">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-extrabold text-white">Table {order.table_id}</span>
                        <span className="text-[10px] font-bold bg-white/5 px-2 py-0.5 rounded text-green-500 border border-green-500/20">
                          #{order._id.slice(-6)}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="text-sm font-medium">
                            <span className="text-green-500 font-bold">{item.quantity}x</span> {item.name}
                            {item.selected_variant && (
                              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-restaurant-textMuted ml-2">
                                {item.selected_variant}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-3 min-w-[120px]">
                      <div className="flex items-center gap-1.5 text-xs text-restaurant-textMuted bg-white/5 px-2 py-1 rounded">
                        <Clock className="w-3.5 h-3.5" /> {mins}m ago
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
    </div>
  );
}
